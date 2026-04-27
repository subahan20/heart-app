import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// FCM Configuration
const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID')
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT')

// ── FCM Push Trigger ─────────────────────────────────────────────────────────
async function triggerFCMPush(token: string, title: string, body: string, data: Record<string, string> = {}) {
  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT) {
    console.error("[fcm] Missing FCM secrets")
    return
  }
  try {
    const accessToken = await getGoogleAccessToken(FCM_SERVICE_ACCOUNT);
    const messagePayload: any = {
      message: {
        token,
        notification: { title, body },
        data: {
          ...data,
          title,
          body,
          sent_at: new Date().toISOString()
        }
      }
    };

    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messagePayload)
    });
    const resData = await res.json();
    if (!res.ok) console.error("[fcm] Error:", resData)
    else console.log("[fcm] Success:", resData.name)
  } catch (err) {
    console.error("[fcm] Fatal:", err)
  }
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson)
  const now = Math.floor(Date.now() / 1000)
  const jwt = await new SignJWT({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform"
  })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(await importPKCS8(sa.private_key, 'RS256'))

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt })
  })
  const data = await res.json()
  return data.access_token
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log(`[checkTasksAndNotify] Function execution log - Triggered at ${new Date().toISOString()}`)

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 1. Fetch all tasks
    const { data: tasks, error: taskErr } = await supabase.from('tasks').select('*')
    if (taskErr) throw taskErr
    console.log(`[checkTasksAndNotify] Fetch check - Tasks found: ${tasks?.length ?? 0}`)

    // 2. Fetch user_daily_tracking for today
    const today = new Date().toISOString().split('T')[0]
    const { data: trackingRows, error: trackErr } = await supabase.from('user_daily_tracking').select('*').eq('date', today)
    if (trackErr) console.error(`[checkTasksAndNotify] Tracking fetch error:`, trackErr.message)
    console.log(`[checkTasksAndNotify] Fetch check - Tracking rows found for ${today}: ${trackingRows?.length ?? 0}`)

    const results = { tasks: 0, tracking: 0, tokens: 0 }

    // ─── Process Custom Tasks ───
    for (const task of tasks ?? []) {
      const message = task.completed ? `Task ${task.title} completed` : `Task ${task.title} not completed yet`
      const { data: tokenData } = await supabase.from('user_tokens').select('fcm_token').eq('user_id', task.user_id).limit(1).maybeSingle()
      
      const { error: insertErr } = await supabase.from('notifications').insert({ user_id: task.user_id, message, is_read: false })
      if (!insertErr) {
        results.tasks++
        if (tokenData?.fcm_token) {
          results.tokens++
          await triggerFCMPush(tokenData.fcm_token, "Task Update", message)
        }
      } else {
        console.error(`[checkTasksAndNotify] Notification insert error (task):`, insertErr.message)
      }
    }

    // ─── Process User Daily Health Tracking ───
    for (const row of trackingRows ?? []) {
      const reminders = []
      if (!row.diet_completed) reminders.push("Diet log is incomplete")
      if (!row.exercise_completed) reminders.push("Morning exercise is not complete")
      if (!row.sleep_completed) reminders.push("Your sleep log (less) is incomplete")
      if (!row.water_completed) reminders.push("Water intake log is incomplete")
      if (!row.mental_completed) reminders.push("Stress management/mental session missing")

      if (reminders.length > 0) {
        const { data: tokenData } = await supabase.from('user_tokens').select('fcm_token').eq('user_id', row.user_id).limit(1).maybeSingle()
        for (const msg of reminders) {
          const { error: insertErr } = await supabase.from('notifications').insert({ 
            user_id: row.user_id, 
            profile_id: row.profile_id,
            message: `Warning: ${msg}`, 
            is_read: false 
          })
          if (!insertErr) {
            results.tracking++
            if (tokenData?.fcm_token) {
              results.tokens++
              await triggerFCMPush(tokenData.fcm_token, "Health Reminder", msg, {
                profile_id: row.profile_id || '',
                type: 'reminder',
                category: 'health',
                date: today
              })
            }
          } else {
            console.error(`[checkTasksAndNotify] Notification insert error (tracking):`, insertErr.message)
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error(`[checkTasksAndNotify] Error:`, err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
