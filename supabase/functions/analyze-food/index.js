    const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

    Deno.serve(async (req) => {
    // 1. Handle Preflight OPTIONS Request FIRST
    if (req.method === "OPTIONS") {
        return new Response("ok", {
        status: 200,
        headers: corsHeaders,
        });
    }

    try {
        const { image, imageUrl, manualMeals } = await req.json()
        let base64Data = ''
        let mimeType = 'image/jpeg'
        let prompt = "Analyze this food image."

        if (manualMeals && Array.isArray(manualMeals)) {
        prompt = `The patient has manually selected the following food items: ${manualMeals.join(', ')}. 
        Analyze this meal combination for a heart-health patient. 
        Provide nutritional estimates if not obvious, but focus on the 'heart_health_advice'.`
        } else if (imageUrl) {
        console.log('Fetching image from URL:', imageUrl)
        const imageRes = await fetch(imageUrl)
        if (!imageRes.ok) throw new Error('Failed to fetch image from URL')
        const arrayBuffer = await imageRes.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Standard way to convert to base64 in Deno environment
        let binary = ''
        const len = uint8Array.byteLength
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i])
        }
        base64Data = btoa(binary)
        
        // Try to determine mime type from response header
        mimeType = imageRes.headers.get('content-type') || 'image/jpeg'
        } else if (image) {
        const [meta, data] = image.split(',')
        base64Data = data
        mimeType = meta.match(/:(.*?);/)[1]
        } else {
        throw new Error('No image, imageUrl, or manualMeals provided')
        }

        const systemInstruction = `You are an expert nutritionist AI specializing in heart health.
        Analyze the provided food (image or text list) and return a strict JSON response.
        
        CRITICAL: 
        1. Calculate the TOTAL calories and nutrition for the ENTIRE portion/plate shown in the image. 
        2. DO NOT provide "per 100g" or "per piece" estimates. If multiple items are visible, estimate for the whole quantity.
        3. The field "heart_health_advice" MUST NEVER BE EMPTY. Provide 1-2 sentences of specific guidance for a heart patient.
        
        Required JSON fields:
        - name: (string) food name
        - type: (string) breakfast/lunch/dinner/snack
        - calories: (number) TOTAL for the whole quantity seen
        - protein: (number) grams TOTAL
        - carbs: (number) grams TOTAL
        - fat: (number) grams TOTAL
        - estimated_weight: (string) e.g., "350g"
        - heart_health_advice: (string) MANDATORY heart health guidance.

        Return ONLY raw JSON.`

        // Construct the Gemini Request Parts
        const parts = [{ text: systemInstruction + "\n\n" + prompt }]
        
        // Add image if available
        if (base64Data) {
        parts.push({
            inlineData: {
            mimeType: mimeType,
            data: base64Data
            }
        })
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API')}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
            responseMimeType: "application/json"
            }
        }),
        })

        const data = await response.json()
        
        if (data.error) {
        throw new Error(data.error.message || 'Gemini API Error')
        }

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!textResponse) {
        throw new Error('No response from AI')
        }

        const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
        const result = JSON.parse(cleanedText)

        return new Response(
        JSON.stringify(result),
        {
            status: 200,
            headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            },
        }
        )

    } catch (error) {
        console.error("Edge Function Error:", error);

        return new Response(
        JSON.stringify({
            error: error.message,
        }),
        {
            status: 500,
            headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            },
        }
        );
    }
    })
