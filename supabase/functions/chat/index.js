
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history = [], userContext, guestSessionId } = await req.json()
    const geminiApiKey = Deno.env.get('GEMINI_API') || Deno.env.get('VITE_GEMINI_API')

    if (!geminiApiKey) {
      throw new Error('No API key found')
    }

    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Resolve User ID from Auth Header
    const authHeader = req.headers.get('Authorization')
    let userId = null
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (user) userId = user.id
    }

    // 3. Construct System Prompt (Strictly following user requirements)
    let systemPrompt = `You are a helpful AI health assistant. 
Always answer the user clearly and directly. 
Provide accurate, relevant responses. 
Stay conversational and supportive.

BEHAVIOR RULES:
1. AI must always answer the user’s question directly.
2. Response must stay strictly related to the user’s query.
3. Use simple, clear language.
4. Avoid repeating the question.
5. Avoid robotic tone.
6. Provide helpful suggestions when relevant.
7. If question is health-related:
   - Provide safe general advice.
   - Do NOT diagnose.
   - Encourage professional consultation only when necessary.
8. Keep answers structured when needed (bullet points, steps, short paragraphs).
9. Do not generate unrelated warnings.
10. Maintain friendly and supportive tone.
11. NO refusal messages.
12. NO unnecessary disclaimers.`

    if (userContext) {
      systemPrompt += `\n\nUSER PROFILE CONTEXT:\n`
      if (userContext.age) systemPrompt += `- Age: ${userContext.age}\n`
      if (userContext.weight) systemPrompt += `- Weight: ${userContext.weight}kg\n`
      if (userContext.diseases?.length > 0) systemPrompt += `- Conditions: ${userContext.diseases.join(', ')}\n`
    }

    // 4. Format History for Gemini (user | assistant -> user | model)
    // Defensive check: Ensure history is an array
    const historyArray = Array.isArray(history) ? history : []
    
    const contents = historyArray.map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.message || item.text || "" }]
    }))

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    })

    // 5. Call Gemini API (using 1.5 flash for speed/cost)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(`Gemini API Error: ${JSON.stringify(err)}`)
    }

    const result = await response.json()
    const aiResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to help! Could you please rephrase that?"

    // 6. Save to DB
    const dbPayload = []
    
    // User message
    dbPayload.push({
      user_id: userId,
      guest_session_id: guestSessionId,
      role: 'user',
      message: message
    })

    // AI message
    dbPayload.push({
      user_id: userId,
      guest_session_id: guestSessionId,
      role: 'assistant',
      message: aiResponseText
    })

    await supabase.from('chat_messages').insert(dbPayload)

    return new Response(
      JSON.stringify({ response: aiResponseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('Chat Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
