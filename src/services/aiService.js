import { supabase } from './supabase'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API || import.meta.env.GEMINI_API



 

export const aiService = {
  generateDietPlan: async (userProfile) => {
    try {
      const { data, error } = await supabase.functions.invoke('diet-plan', {
        body: { userProfile }
      })
      
      if (error) throw error
      
      const aiData = data.candidates?.[0]?.content?.parts?.[0]?.text 
        ? JSON.parse(data.candidates[0].content.parts[0].text)
        : data

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('diet_plans')
          .insert({
            user_id: user.id,
            plan_data: aiData,
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
      }
      
      return aiData
    } catch (error) {
      console.error('AI Diet Plan Error:', error)
      throw error
    }
  },

  generateRecommendations: async (userProfile, recentData) => {
    try {
      const { data, error } = await supabase.functions.invoke('recommendations', {
        body: { userProfile, recentData }
      })
      
      if (error) throw error
      
      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('recommendations')
          .insert({
            user_id: user.id,
            recommendation_data: data,
            context_data: { userProfile, recentData },
            generated_at: new Date().toISOString()
          })
      }
      
      return data
    } catch (error) {
      console.error('AI Recommendations Error:', error)
      throw error
    }
  },


  getChatSessionId: () => {
    // 1. Try to get from localStorage (new preferred storage)
    let sessionId = localStorage.getItem('heart_chat_guest_session')
    
    // 2. Fallback to sessionStorage (migration path for existing users)
    if (!sessionId) {
      sessionId = sessionStorage.getItem('heart_chat_guest_session')
      if (sessionId) {
        // Migrate to localStorage for future consistency
        localStorage.setItem('heart_chat_guest_session', sessionId)
      }
    }

    // 3. Generate new if not found in either
    if (!sessionId) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem('heart_chat_guest_session', sessionId)
    }
    return sessionId
  },

  getChatHistory: async (userId, guestSessionId) => {
    try {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        
      if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      } else {
        return []
      }

      const { data, error } = await query
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error('Error fetching chat history:', error)
      return []
    }
  },

  chatWithAssistant: async (message, history, userProfile) => {
    try {
      const geminiApiKey = GEMINI_API_KEY
      if (!geminiApiKey) {
        throw new Error('AI service unavailable: No API key configured')
      }

      // Format history for Gemini
      const formattedHistory = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.message }]
      }))

      // Create system instruction based on user profile
      const systemInstruction = `You are a helpful, empathetic, and knowledgeable heart health assistant. 
        You are talking to a user with the following profile:
        Name: ${userProfile?.name || 'User'}
        Age: ${userProfile?.age || 'Unknown'}
        Weight: ${userProfile?.weight ? userProfile.weight + 'kg' : 'Unknown'}
        Height: ${userProfile?.height ? userProfile.height + 'cm' : 'Unknown'}
        Pre-existing conditions: ${userProfile?.diseases?.join(', ') || 'None reported'}
        
        Keep your answers concise, encouraging, and focused on heart health, diet, exercise, and stress management. 
        CRITICAL: Never provide a medical diagnosis. Always advise consulting a doctor for serious concerns.`

      // Prepare request payload
      const requestBody = {
        contents: [
          ...formattedHistory,
          { role: 'user', parts: [{ text: message }] }
        ],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.7,
        }
      }

      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`)
      }

      const result = await response.json()
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text
      
      if (!responseText) {
        throw new Error('No response from Gemini API')
      }

      // Try to save to Supabase asynchronously (don't block the UI return)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null

        await supabase.from('chat_messages').insert([
          { 
            user_id: user?.id || null,
            guest_session_id: guestSessionId,
            message: message, 
            role: 'user' 
          },
          { 
            user_id: user?.id || null,
            guest_session_id: guestSessionId,
            message: responseText, 
            role: 'assistant' 
          }
        ])
      } catch (dbError) {
        console.error('Failed to save chat to history:', dbError)
      }

      return responseText

    } catch (error) {
      console.error('Chat Assistant Error:', error)
      throw error
    }
  },


  analyzeDailyHealthStatus: async (userProfile, rawData) => {
    try {
      const { data, error } = await supabase.functions.invoke('daily-insights', {
        body: { 
          dailyData: rawData, 
          userProfile: { ...userProfile } 
        }
      })
      
      if (error) throw error

      if (data && data.notifications) {
        return {
          alerts: data.notifications.alerts || [],
          warnings: data.notifications.warnings || [],
          notifications: data.notifications.notifications || []
        }
      }
      
      return { alerts: [], warnings: [], notifications: [] }
    } catch (error) {
      console.error('AI Health Status Analysis Error:', error)
      throw error
    }
  },



  resizeImage: (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 800
          const MAX_HEIGHT = 800
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
      }
    })
  },

  analyzeFoodImage: async (imageFile, imageUrl = null) => {
    try {
      const base64withMeta = await aiService.resizeImage(imageFile)
      if (!base64withMeta || typeof base64withMeta !== 'string') {
        throw new Error('Failed to process image data')
      }
      const payload = imageUrl ? { imageUrl } : { image: base64withMeta }
      
      const functionName = 'analyze-food'

      // 2. Try the Edge Function first (Server-side AI)
      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: payload
        })

        if (!error && data && !data.error) {
          console.log('AI Analysis successful via Edge Function')
          return data
        }

        // If it's a 404 (Not Found), it means deployment is missing
        if (error?.message?.includes('404') || error?.status === 404) {
          console.warn('Edge Function not found (404). Falling back to client-side AI.')
        } else if (error) {
          // Log but don't throw, so we can try the fallback
          console.warn('Edge Function invocation error, trying fallback:', error.message)
        }
      } catch (invokeError) {
        console.warn('Edge Function unreachable, trying fallback:', invokeError.message)
      }

      // 3. Fallback: Client-side AI
      const geminiApiKey = GEMINI_API_KEY
      if (!geminiApiKey) {
        console.error('DEBUG: Fallback failed - GEMINI_API_KEY is missing.')
        throw new Error('Edge Function failed and no client-side API key found.')
      }

      const [meta, base64Data] = base64withMeta.split(',')
      const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg'

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Analyze the food in the image and provide a strict JSON response. CRITICAL: Analyze the TOTAL quantity shown in the image, not per unit. Return JSON with: name, type (breakfast, lunch, snacks, or dinner), calories (TOTAL number for the whole portion), protein (number), carbs (number), fat (number), estimated_weight (string), and heart_health_advice (string)." },
              { 
                inlineData: { 
                  mimeType: mimeType, 
                  data: base64Data 
                } 
              }
            ]
          }],
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.7 
          }
        })
      })

      const result = await response.json()
      
      if (result.error) {
        throw new Error(`Gemini API Error: ${result.error.message || 'Unknown error'}`)
      }

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new Error('Client-side AI failed to respond - no content received')
      }
      
      // Clean potential markdown if Gemini sends it despite setting responseMimeType
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
      return JSON.parse(jsonStr)

    } catch (error) {
      console.error('Total AI Analysis Failure:', error)
      throw error
    }
  },

  analyzeManualMeals: async (mealNames) => {
    try {
      const functionName = 'analyze-food'

      // 1. Try Edge Function
      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { manualMeals: mealNames }
        })

        if (!error && data && !data.error) {
          // Validate that we have actual nutritional data
          if (data.calories && data.protein && data.heart_health_advice) {
            console.log('Manual Meal Analysis successful via Edge Function')
            return data
          } else {
            console.warn('Edge Function returned incomplete data:', data)
          }
        } else if (error) {
          console.warn('Edge Function manual analysis failed, trying fallback:', error.message)
        }
      } catch (invokeError) {
        console.warn('Edge Function unreachable for manual analysis, trying fallback:', invokeError.message)
      }

      // 2. Fallback to Client AI
      const geminiApiKey = GEMINI_API_KEY
      if (!geminiApiKey) {
        console.error('No Gemini API key available for fallback')
        throw new Error('AI service unavailable: No API key configured')
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert nutritionist specializing in heart health. Analyze these food items: ${mealNames.join(', ')}. 
              CRITICAL: Return a strict JSON response. The field "heart_health_advice" MUST NEVER BE EMPTY. Provide specific guidance for a heart patient.
              Fields: name, calories, protein, carbs, fat, estimated_weight, heart_health_advice.`
            }]
          }],
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.7 
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`)
      }

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new Error('No response from Gemini API')
      }
      
      const parsedResult = JSON.parse(text)
      return parsedResult

    } catch (error) {
      console.error('All meal analysis methods failed:', error)
      
      // Log rate limit but fall through to final fallback
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.warn('AI service rate limited. Using healthy meal fallback.')
      }
      
      // Final fallback with mock data
      return {
        name: mealNames.join(', '),
        type: 'meal',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        estimated_weight: '300g',
        heart_health_advice: 'This meal provides balanced nutrition. Consider portion control and include vegetables for better heart health.'
      }
    }
  },

  // ── AI Meal Suggestions (per meal type) ──────────────────────────────────────
  getMealSuggestions: async (mealType, userProfile = null) => {
    const geminiApiKey = GEMINI_API_KEY

    const mealContext = {
      breakfast: 'morning breakfast (6 AM – 12 PM), energizing and nutritious to start the day',
      lunch:     'afternoon lunch (12 PM – 4 PM), balanced and filling midday meal',
      snacks:    'evening snacks and healthy juices (4 PM – 8 PM). Include both light snacks AND healthy juice options like beetroot juice, amla juice, pomegranate juice, coconut water etc.',
      dinner:    'dinner (8 PM onwards), light yet nutritious evening meal',
    }

    // Calculate BMI if missing but height/weight exist
    let bmi = userProfile?.bmi
    if (!bmi && userProfile?.height && userProfile?.weight) {
      const heightInMeters = userProfile.height / 100
      bmi = (userProfile.weight / (heightInMeters * heightInMeters)).toFixed(1)
    }

    const profileText = userProfile
      ? `User profile: Age ${userProfile.age || 'adult'}, Weight ${userProfile.weight || 'normal'}kg, Height ${userProfile.height || 'normal'}cm, BMI: ${bmi || 'unknown'}, Conditions: ${Array.isArray(userProfile.diseases) ? userProfile.diseases.join(', ') : (userProfile.diseases || 'none')}.`
      : ''

    const prompt = `You are a certified nutritionist and heart health expert.
${profileText}
Suggest exactly 8 healthy ${mealContext[mealType] || mealType} items suited for a heart-conscious Indian diet.
CRITICAL: Personalize the calorie counts and food choices based on the user's BMI (${bmi || 'unknown'}).
- If BMI > 25 (Overweight/Obese): Suggest lower calorie, high fiber, and filling options.
- If BMI < 18.5 (Underweight): Suggest calorie-dense, healthy-fat, and protein-rich options.
- If BMI is Normal: Suggest balanced maintenance options.

Mix traditional and modern healthy options. Include accurate values for calories, protein, carbs, and fat.
${mealType === 'snacks' ? 'Include at least 3–4 healthy juice/drink options (coconut water, beetroot juice, amla juice, pomegranate juice, etc.)' : ''}

Return ONLY a JSON array (no markdown) like:
[
  { "name": "Oatmeal with Banana", "calories": 280, "protein": 8, "carbs": 45, "fat": 5 },
  ...
]`

    const STATIC_FALLBACKS = {
      breakfast: [
        { name: 'Oatmeal with Banana', calories: 280, protein: 8, carbs: 45, fat: 5 },
        { name: 'Idli with Sambar',    calories: 200, protein: 7, carbs: 38, fat: 3 },
        { name: 'Greek Yogurt & Fruits', calories: 180, protein: 10, carbs: 28, fat: 4 },
        { name: 'Whole Wheat Toast & Eggs', calories: 320, protein: 18, carbs: 30, fat: 12 },
      ],
      lunch: [
        { name: 'Brown Rice with Dal', calories: 380, protein: 14, carbs: 65, fat: 5 },
        { name: 'Chapati with Vegetable Sabzi', calories: 420, protein: 12, carbs: 70, fat: 8 },
        { name: 'Grilled Chicken Salad', calories: 350, protein: 30, carbs: 20, fat: 12 },
        { name: 'Quinoa Vegetable Bowl', calories: 360, protein: 14, carbs: 55, fat: 9 },
      ],
      snacks: [
        { name: 'Beetroot & Carrot Juice 🧃', calories: 90,  protein: 2, carbs: 20, fat: 0 },
        { name: 'Coconut Water 🥥',           calories: 45,  protein: 1, carbs: 10, fat: 0 },
        { name: 'Roasted Makhana',             calories: 100, protein: 4, carbs: 18, fat: 2 },
        { name: 'Mixed Nuts',                  calories: 160, protein: 5, carbs: 8,  fat: 14 },
      ],
      dinner: [
        { name: 'Moong Dal Soup & Chapati',    calories: 370, protein: 16, carbs: 55, fat: 6 },
        { name: 'Grilled Fish & Salad',        calories: 350, protein: 32, carbs: 14, fat: 14 },
        { name: 'Vegetable Soup & Toast',      calories: 250, protein: 8,  carbs: 38, fat: 5 },
        { name: 'Dalia Porridge',              calories: 280, protein: 9,  carbs: 50, fat: 4 },
      ],
    }

    if (!geminiApiKey) {
      console.warn('[getMealSuggestions] No API key — using fallback items')
      return STATIC_FALLBACKS[mealType] ?? STATIC_FALLBACKS.lunch
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              responseMimeType: 'application/json', 
              temperature: 0.7 
            },
          }),
        }
      )

      if (!response.ok) throw new Error(`Gemini ${response.status}`)

      const result = await response.json()
      const text   = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty AI response')

      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid AI array')

      return parsed
    } catch (err) {
      console.warn('[getMealSuggestions] AI failed, using fallback:', err.message)
      return STATIC_FALLBACKS[mealType] ?? STATIC_FALLBACKS.lunch
    }
  },

  testConnection: async () => {
    try {
      const { data, error } = await supabase.functions.invoke('connection-test')
      if (error) throw error
      return data
    } catch (error) {
      console.error('Connection Test Failed:', error)
      throw error
    }
  },

  generateExerciseInsights: async (exerciseData, profile) => {
    try {
      const geminiApiKey = GEMINI_API_KEY
      if (!geminiApiKey) {
        console.warn('No Gemini API key available, using mock data')
        return aiService.getMockExerciseInsights(exerciseData)
      }

      const prompt = `You are an expert fitness coach and cardiologist specializing in heart-healthy exercise routines.
      
      Analyze this exercise data and provide personalized insights:
      - Exercise Type: ${exerciseData.type}
      - Duration: ${exerciseData.duration} minutes
      - Distance: ${exerciseData.distance} km
      - User Age: ${profile?.age || 'Unknown'}
      - User Weight: ${profile?.weight || 'Unknown'} kg
      
      Provide a JSON response with these fields:
      {
        "calories_burned": number,
        "cadence": "optimal cadence advice string",
        "pace_analysis": "analysis of walking/running pace",
        "heart_health_benefits": "benefits for heart health",
        "recommendations": "personalized recommendations",
        "over_exercise_warning": "warning if over-exercising or null",
        "daily_goal_status": "how this contributes to daily goals",
        "improvement_tips": "tips to improve next time"
      }`

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: { temperature: 0.7 }
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`)
      }

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new Error('No response from Gemini API')
      }
      
      return JSON.parse(text)
    } catch (error) {
      console.error('Exercise insights generation failed:', error)
      return aiService.getMockExerciseInsights(exerciseData)
    }
  },

  generateWeeklyTransformationPlan: async (userProfile, progressData, weekNumber) => {
    try {
      const geminiApiKey = GEMINI_API_KEY
      if (!geminiApiKey) {
        throw new Error('AI service unavailable: No API key configured')
      }

      const isFirstWeek = weekNumber === 1
      
      // Handle null userProfile by providing basic defaults
      const safeUserProfile = userProfile || {
        name: 'User',
        age: 30,
        weight: 70,
        height: 170,
        gender: 'other',
        activity_level: 'moderate',
        transformation_goal: 'Health Improvement'
      }
      
      const prompt = `You are an elite health transformation coach. Create a ${isFirstWeek ? 'Level 1 Start Plan' : `Week ${weekNumber} Progressive Plan`} for a 12-week program.
 
 User Profile:
 - Age: ${safeUserProfile.age}
 - Weight: ${safeUserProfile.weight}kg
 - BMI: ${safeUserProfile.bmi || 'Not calculated'}
 - Goal: ${safeUserProfile.transformation_goal || 'Health Improvement'}
 - BP: ${progressData?.latestBP || 'Normal'}
 - Heart Rate: ${progressData?.latestHR || 'Normal'}
 - Blood Sugar: ${progressData?.bloodSugar || 'Not provided'}
 - Thyroid status: ${progressData?.thyroidStatus || 'Not provided'}

${!isFirstWeek ? `
Previous Week Progress:
- Weight Change: ${progressData?.weightChange || 0}kg
- Completion Rate: ${progressData?.completionRate || 0}%
- Observations: ${progressData?.observations || 'Consistent logs'}
` : ''}

CRITICAL RULES:
1. If BP is high, suggest low-sodium foods and avoid high-intensity workouts.
2. If Blood Sugar is high, strictly limit simple carbs and sugar, focus on high fiber.
3. If Thyroid issues (Hypo), prioritize iodine-rich or metabolism-boosting foods; if (Hyper), ensure adequate calorie surplus.
4. If weight isn't changing, adjust calories by 10-15%.
5. If heart rate is unstable, recommend light cardio/walking.
6. If progress is great, increase exercise duration/intensity slightly.

Return ONLY a JSON object with this exact structure:
{
  "week_number": ${weekNumber},
  "diet": {
    "total_calories": number,
    "focus": "string",
    "recommended_foods": ["string"],
    "advice": "string"
  },
  "exercise": {
    "type": "string",
    "duration_minutes": number,
    "target_km": number,
    "intensity": "low" | "medium" | "high",
    "advice": "string"
  },
  "health_suggestions": "Specific advice based on heart rate and BP",
  "motivational_message": "A short inspiring message"
}`

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7
          }
        })
      })

      if (!response.ok) throw new Error(`Gemini API Error: ${response.status}`)

      const result = await response.json()
      const planText = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (!planText) throw new Error('AI failed to generate a plan')
      
      return JSON.parse(planText)
    } catch (error) {
      // Handle Rate Limits (429) quietly since we have a fallback
      if (error.message?.includes('429') || error.status === 429) {
        console.warn('[AI Service] Rate limit reached (429). Using healthy fallback plan.')
      } else {
        console.error('Weekly Plan Generation Error (Falling back to default):', error)
      }
      
      // ABSOLUTE FALLBACK: Provide a high-quality default plan so the user is NEVER blocked
      return {
        week_number: weekNumber,
        diet: {
          total_calories: 2000,
          focus: "Balanced Nutrition & Heart Health",
          recommended_foods: ["Oatmeal with berries", "Grilled salmon with asparagus", "Leafy green salads", "Assorted nuts"],
          advice: "Focus on whole foods and consistent meal timing. Even when the AI is busy, these heart-healthy staples will keep you on track."
        },
        exercise: {
          type: "Moderate Cardio & Walking",
          duration_minutes: 30,
          target_km: 2.0,
          intensity: "medium",
          advice: "Aim for 30 minutes of brisk activity. Consistency is more important than intensity during this phase."
        },
        health_suggestions: "Stay hydrated and prioritize sleep. Your body needs recovery time during this transformation.",
        motivational_message: "You're doing great! Progress isn't always linear, but staying committed to the journey is what counts."
      }
    }
  },

  getMockExerciseInsights: (exerciseData) => {
    // Calculate estimated calories based on exercise type and duration
    const caloriesPerMinute = {
      running: 10,
      walking: 4,
      exercise: 6
    }
    const caloriesBurned = Math.round((caloriesPerMinute[exerciseData.type] || 5) * exerciseData.duration)
    
    return {
      calories_burned: caloriesBurned,
      cadence: `For ${exerciseData.type}, maintain a steady cadence of ${exerciseData.type === 'running' ? '160-180' : '100-120'} steps per minute for optimal heart health benefits.`,
      pace_analysis: `Your pace of ${(exerciseData.distance / (exerciseData.duration / 60)).toFixed(1)} km/h is ${exerciseData.type === 'running' ? 'good for endurance training' : 'perfect for cardiovascular health'}.`,
      heart_health_benefits: `This ${exerciseData.duration}-minute ${exerciseData.type} session improves cardiovascular endurance, lowers blood pressure, and strengthens heart muscles. Regular exercise reduces heart disease risk by 30%.`,
      recommendations: `Aim for 150 minutes of moderate exercise per week. You're making great progress! Try to maintain consistency.`,
      over_exercise_warning: exerciseData.duration > 60 ? `You've exercised for over an hour. Ensure proper hydration and rest to avoid overtraining.` : null,
      daily_goal_status: `You've completed ${exerciseData.duration} minutes towards your daily goal of 30 minutes. ${exerciseData.duration >= 30 ? '🎉 Goal achieved!' : 'Keep going!'}`,
      improvement_tips: `To improve: gradually increase duration by 5-10% weekly, maintain proper form, and ensure adequate rest between sessions.`
    }
  },
}