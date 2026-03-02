import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userProfile, recentData } = await req.json()
    
    const promptText = `Based on this health data, provide 3 personalized recommendations:
    
    User Profile: ${JSON.stringify(userProfile)}
    Recent Data:
    - Latest BP: ${recentData.bpReadings[0]?.systolic}/${recentData.bpReadings[0]?.diastolic || 'N/A'}
    - Latest Sugar: ${recentData.sugarReadings[0]?.glucose} mg/dL (${recentData.sugarReadings[0]?.type || 'N/A'})
    - Exercise this week: ${recentData.exercises.length} sessions
    - Average Stress: ${recentData.stressLevels.length > 0 ? (recentData.stressLevels.reduce((a, b) => a + b.level, 0) / recentData.stressLevels.length).toFixed(1) : 'N/A'}
    
    Generate gentle, actionable recommendations. Return as JSON array.`

    // Call Google Gemini AI API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a health coach specializing in Indian lifestyle diseases. Generate 3 personalized health recommendations based on user data. Be gentle, encouraging, and focus on prevention.

${promptText}

Return the response as a valid JSON array with 3 recommendation objects.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      }),
    })

    const result = await response.json()
    const recommendations = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || "[]")
    
    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Recommendations Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
