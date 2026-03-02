import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Daily insights function called')
    
    const { dailyData, userProfile, userId } = await req.json()
    console.log('Request data:', { dailyData, userProfile: !!userProfile, userId })
    
    // Handle null userProfile by providing defaults
    const safeUserProfile = userProfile || {
      name: 'User',
      age: 30,
      gender: 'other',
      activity_level: 'moderate'
    }
    
    console.log('Using safeUserProfile:', safeUserProfile)
    
    const GEMINI_API = Deno.env.get('GEMINI_API')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('Environment variables check:', {
      hasGeminiApi: !!GEMINI_API,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
    })

    if (!GEMINI_API) {
      console.error('GEMINI_API environment variable not found')
      throw new Error('GEMINI_API is not configured')
    }

    // 1. Construct the prompt for Gemini
    const prompt = `As a heart health assistant, analyze this daily data for ${safeUserProfile.name} and provide:
    1. A list of 3-4 personalized, actionable insights (for cards).
    2. A set of strictly categorized notifications (for status badges).

User Profile:
- Age: ${safeUserProfile.age}
- Gender: ${safeUserProfile.gender}
- Activity Level: ${safeUserProfile.activity_level}

Today's Metrics:
- Diet: ${dailyData?.diet?.total_calories || 0} kcal consumed
- Exercise: ${dailyData?.exercise?.total_minutes || 0} min activity
- Goal Intake: 2000 kcal (Standard)
- Goal Exercise: 30 min (Standard)
    
    Analysis Requirements:
    1. Calorie/Exercise Balance: If calories are > 2000 but exercise is < 30 min, generate a "high" priority warning.
    2. Tone: Be encouraging but direct about imbalances.
    3. Insights: Provide 3-4 personalized, actionable insights.
    4. Notifications:
       - Alerts: Critical health issues (BP/Sugar).
       - Warnings: High-calorie/low-exercise imbalances and missed goals.
       - Notifications: Successes for staying on track.

    Return the response as a single valid JSON object with this EXACT structure:
    {
      "insights": [
        {
          "title": "Short title",
          "description": "Encouraging 1-2 sentence recommendation.",
          "priority": "high" | "medium" | "low"
        }
      ],
      "notifications": {
        "alerts": [ { "title": "...", "message": "...", "type": "critical" } ],
        "warnings": [ { "title": "...", "message": "...", "type": "warning" } ],
        "notifications": [ { "title": "...", "message": "...", "type": "success" } ]
      }
    }
    
    Response MUST be ONLY the JSON object.`

    // 2. Call Google Gemini AI
    console.log('Calling Gemini API...')
    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    )

    console.log('Gemini API response status:', apiResponse.status)

    if (!apiResponse.ok) {
      const errorDetail = await apiResponse.text()
      console.error('Gemini API error:', { status: apiResponse.status, detail: errorDetail })
      throw new Error(`Gemini API Error: ${apiResponse.status} - ${errorDetail}`)
    }

    const aiResult = await apiResponse.json()
    console.log('Gemini API response received:', !!aiResult)
    
    const insightsText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    console.log('Insights text length:', insightsText.length)
    
    let resultData
    try {
      resultData = JSON.parse(insightsText)
      console.log('Parsed AI result successfully')
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw text:', insightsText)
      throw new Error(`Failed to parse AI response: ${parseError.message}`)
    }

    // Ensure the structure matches what the frontend / DB expects
    const finalInsights = {
      insights: resultData.insights || [],
      notifications: resultData.notifications || { alerts: [], warnings: [], notifications: [] }
    }

    // 3. Persist to Supabase if config is available
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const todayStr = new Date().toISOString().split('T')[0]
      
      // Check if this is a guest user
      const isGuestUser = userId.startsWith('guest_')
      
      if (isGuestUser) {
        // Guest user: store with null user_id and guest_session_id in context_data
        const { error: dbError } = await supabase
          .from('recommendations')
          .upsert({
            user_id: null,
            guest_session_id: userId, // Correctly use guest_session_id field
            recommendation_data: finalInsights.insights,
            context_data: { 
              type: 'daily_insights', 
              date: todayStr, 
              full_data: finalInsights,
              is_guest: true
            },
            generated_at: new Date().toISOString()
          }, { onConflict: 'guest_session_id,generated_at::date' })
        
        if (dbError) console.error('Database storage error (guest recommendations):', dbError)
      } else {
        // Authenticated user: store with actual user_id (UUID)
        const { error: dbError } = await supabase
          .from('recommendations')
          .upsert({
            user_id: userId,
            recommendation_data: finalInsights.insights,
            context_data: { 
              type: 'daily_insights', 
              date: todayStr, 
              full_data: finalInsights,
              is_guest: false
            },
            generated_at: new Date().toISOString()
          }, { onConflict: 'user_id,generated_at::date' })
        
        if (dbError) console.error('Database storage error (recommendations):', dbError)

        // Save Notifications (only for authenticated users to avoid spam)
        if (!isGuestUser) {
          const notificationsToSave = []
          
          // Map AI notifications to DB schema
          if (finalInsights.notifications && finalInsights.notifications.alerts) {
            finalInsights.notifications.alerts.forEach(n => {
              notificationsToSave.push({
                user_id: userId,
                guest_session_id: null,
                category: 'ai_alert',
                type: 'alert',
                title: n.title,
                message: n.message,
                metadata: { ai_generated: true, date: todayStr }
              })
            })
          }

          if (finalInsights.notifications && finalInsights.notifications.warnings) {
            finalInsights.notifications.warnings.forEach(n => {
              notificationsToSave.push({
                user_id: userId,
                guest_session_id: null,
                category: 'ai_warning',
                type: 'warning',
                title: n.title,
                message: n.message,
                metadata: { ai_generated: true, date: todayStr }
              })
            })
          }

          if (finalInsights.notifications && finalInsights.notifications.notifications) {
            finalInsights.notifications.notifications.forEach(n => {
              notificationsToSave.push({
                user_id: userId,
                guest_session_id: null,
                category: 'ai_insight',
                type: 'ai_message',
                title: n.title,
                message: n.message,
                metadata: { ai_generated: true, date: todayStr }
              })
            })
          }

          if (notificationsToSave.length > 0) {
            const { error: notifError } = await supabase
              .from('notifications')
              .upsert(notificationsToSave, { 
                onConflict: 'user_id,guest_session_id,date,category,type' 
              })
            
            if (notifError && notifError.code !== '23505') {
              console.error('Database storage error (notifications):', notifError)
            }
          }
        } else {
          console.log('Guest user - skipping notifications storage')
        }
      }
    }

    // 4. Return the result
    return new Response(JSON.stringify(finalInsights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Edge Function Error:', error.message)
    console.error('Full error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString(),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
