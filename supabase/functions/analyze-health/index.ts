import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { weight, height, systolic_bp, diastolic_bp, pulse_rate, blood_sugar, thyroid_status, notes } = await req.json()

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) throw new Error('Unauthorized')

    // 1. Calculate BMI
    const heightInMeters = height / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    let bmi_category = ''
    if (bmi < 18.5) bmi_category = 'underweight'
    else if (bmi < 25) bmi_category = 'normal'
    else if (bmi < 30) bmi_category = 'overweight'
    else bmi_category = 'obese'

    // 2. Categorize Blood Pressure
    let bp_category = ''
    if (systolic_bp < 120 && diastolic_bp < 80) bp_category = 'normal'
    else if (systolic_bp < 130 && diastolic_bp < 80) bp_category = 'elevated'
    else if (systolic_bp < 140 || diastolic_bp < 90) bp_category = 'hypertension stage 1'
    else bp_category = 'hypertension stage 2'

    // 3. Categorize Blood Sugar
    let sugar_category = ''
    if (blood_sugar < 100) sugar_category = 'normal'
    else if (blood_sugar < 126) sugar_category = 'prediabetic'
    else sugar_category = 'diabetic'

    // 4. Save check-in data
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .insert({
        user_id: user.id,
        weight,
        height,
        bmi,
        systolic_bp,
        diastolic_bp,
        pulse_rate,
        blood_sugar,
        thyroid_status,
        notes,
        bmi_category,
        bp_category,
        sugar_category
      })
      .select()
      .single()

    if (checkinError) throw checkinError

    // 5. Call AI (Using OpenAI as default, can be configured)
    const systemPrompt = `You are a professional AI Health Assistant.
Analyze the user's health metrics and generate a personalized diet and exercise plan.
The plan must be realistic, safe, and tailored to the user’s health category.
Do not give generic plans.
Avoid extreme recommendations.
Keep it structured and clear.`

    const userData = {
      weight,
      height,
      BMI_category: bmi_category,
      systolic_bp,
      diastolic_bp,
      BP_category: bp_category,
      blood_sugar,
      sugar_category: sugar_category,
      thyroid_status,
      pulse_rate,
      notes
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userData) }
        ],
        response_format: { type: 'json_object' }
      }),
    })

    const aiData = await aiResponse.json()
    const recommendation = JSON.parse(aiData.choices[0].message.content)

    // 6. Save recommendation
    const { data: finalRec, error: recError } = await supabase
      .from('ai_recommendations')
      .insert({
        user_id: user.id,
        checkin_id: checkin.id,
        risk_level: recommendation.risk_level,
        diet_plan: recommendation.diet_plan,
        exercise_plan: recommendation.exercise_plan,
        health_advice: recommendation.health_advice
      })
      .select()
      .single()

    if (recError) throw recError

    return new Response(JSON.stringify(finalRec), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
