// ============================================================
// supabase/functions/reminder-scheduler/index.ts
// Runs on a cron schedule (every 30 min recommended).
// Checks user_reminder_settings and sends notifications
// for incomplete tasks whose reminder time has come.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.2.0'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// FCM Configuration (Set these in Supabase Secrets)
// FCM_PROJECT_ID: your-project-id
// FCM_SERVICE_ACCOUNT: { "type": "service_account", ... }
const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID')
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT')

// ── Time utilities ────────────────────────────────────────────────────────────
function nowInTz(tz: string): { hour: number; minute: number; dayOfWeek: string } {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;
  
  return { 
    hour: Number(getPart('hour')), 
    minute: Number(getPart('minute')), 
    dayOfWeek: (getPart('weekday') || '').toLowerCase().slice(0, 3)
  };
}

function todayStr(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function shouldRunToday(setting: any, tz: string): boolean {
  const { dayOfWeek } = nowInTz(tz)
  if (setting.repeat_type === 'daily')   return true
  if (setting.repeat_type === 'weekly')  return dayOfWeek === 'sun'
  if (setting.repeat_type === 'custom')  return (setting.custom_days ?? []).includes(dayOfWeek)
  return false
}

// ── Task completion map (daily_tracking column per section) ───────────────────
const COMPLETE_FIELD: Record<string, string> = {
  diet:     'diet_completed',
  exercise: 'exercise_completed',
  water:    'water_completed',
  mental:   'mental_completed',
  sleep:    'sleep_completed',
}

// ── Reminder messages ─────────────────────────────────────────────────────────
const MESSAGES: Record<string, string[]> = {
  diet:     ["🥗 Diet is not completed yet. Please complete it.", "🍎 Don't forget to log your meals for today."],
  breakfast:["🥣 Breakfast is not completed yet. Please complete it."],
  exercise: ["💪 Exercise is not completed yet. Please complete it.", "🏃 Stay active! Don't forget your daily workout."],
  water:    ["💧 Water intake is not completed yet. Please complete it.", "🥤 Keep hydrated! Have a glass of water."],
  mental:   ["🧘 Stress management is not completed yet. Please complete it.", "🌿 Take a moment for your mental wellness."],
  sleep:    ["😴 Sleep log is not completed yet. Please complete it.", "🌙 Rest well! Don't forget to track your sleep."],
}

function pickMessage(section: string): string {
  const pool = MESSAGES[section] ?? [`Reminder: ${section} goal incomplete`]
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Send notification ─────────────────────────────────────────────────────────
async function sendNotification(userId: string | null, guestSessionId: string | null, section: string, message: string, date: string, slot: string = 'default', profileId: string | null = null) {
  const { error } = await supabase.from('notifications').upsert({
    user_id:  userId,
    guest_session_id: guestSessionId,
    profile_id: profileId,
    type:     'reminder',
    category: section,
    date,
    slot,
    title:    `${section.charAt(0).toUpperCase() + section.slice(1)} Reminder 🔔`,
    message,
    metadata: { section, goal: section, sent_at: new Date().toISOString() },
    is_read:  false,
  }, { onConflict: 'profile_id,date,category,type,slot', ignoreDuplicates: false })

  if (error) {
    console.error(`[scheduler] notify error (${section}) slot(${slot}):`, error.message)
    return
  }

  // Fetch FCM token
  let tokenQuery = supabase.from('profiles').select('fcm_token')
  if (profileId) {
    tokenQuery = tokenQuery.eq('id', profileId)
  } else if (userId) {
    tokenQuery = tokenQuery.eq('user_id', userId)
  } else {
    tokenQuery = tokenQuery.eq('guest_session_id', guestSessionId).is('user_id', null)
  }

  const { data: profile } = await tokenQuery.maybeSingle()
  const fcmToken = profile?.fcm_token

  if (fcmToken) {
    console.log(`[scheduler] Sending FCM push to user: ${userId || guestSessionId} (Profile: ${profileId || 'none'})`)
    await triggerFCMPush(fcmToken, `${section.charAt(0).toUpperCase() + section.slice(1)} Reminder 🔔`, message, {
      profile_id: profileId || '',
      category: section,
      type: 'reminder',
      date
    })
  }
}

// ── FCM Push Trigger (HTTP v1) ────────────────────────────────────────────────
async function triggerFCMPush(token: string, title: string, body: string, data: Record<string, string> = {}) {
  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT) {
    console.error("[fcm] Missing FCM_PROJECT_ID or FCM_SERVICE_ACCOUNT secrets")
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
    
    console.log(`[fcm] Sending push to ${token.slice(0, 10)}... (Patient: ${data.patient_id || 'none'})`)
    
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messagePayload)
    });

    const resData = await res.json();
    if (!res.ok) {
      console.error("[fcm] Send error:", resData)
    } else {
      console.log("[fcm] Send success:", resData.name)
    }
  } catch (err) {
    console.error("[fcm] Fatal:", err)
  }
}

// ── Google OAuth2 Token Exchange ──────────────────────────────────────────────
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson)
  const privateKey = sa.private_key
  const clientEmail = sa.client_email
  
  const now = Math.floor(Date.now() / 1000)
  
  const jwt = await new SignJWT({
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform"
  })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(await importPKCS8(privateKey, 'RS256'))

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`OAuth error: ${JSON.stringify(data)}`)
  return data.access_token
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (_req) => {
  try {
    // 1. Fetch all enabled reminder settings
    const { data: settings, error: settingsErr } = await supabase
      .from('user_reminder_settings')
      .select('*')
      .eq('is_enabled', true)

    if (settingsErr) throw settingsErr
    if (!settings?.length) return new Response('No settings', { status: 200 })

    // Group by (user_id | guest_session_id)
    const processedIndices = new Set<string>()

    for (const setting of settings) {
      try {
        const userId         = setting.user_id
        const guestSessionId = setting.guest_session_id
        const tz             = setting.timezone ?? 'Asia/Kolkata'
        const date           = todayStr(tz)
        const { hour, minute } = nowInTz(tz)
        const nowMins        = hour * 60 + minute

        // Skip if not today's repeat
        if (!shouldRunToday(setting, tz)) {
          console.log(`[scheduler] Skipping ${setting.section} for user ${userId || guestSessionId}: Not scheduled for today.`)
          continue
        }

        // 2. Fetch user_daily_tracking for today
        let query = supabase
          .from('user_daily_tracking')
          .select(`
            diet_completed, exercise_completed, water_completed, mental_completed, sleep_completed,
            diet_reminders_sent, exercise_reminders_sent, water_reminders_sent, mental_reminders_sent, sleep_reminders_sent,
            last_diet_reminder_at, last_exercise_reminder_at, last_water_reminder_at, last_mental_reminder_at, last_sleep_reminder_at
          `)
          .eq('date', date)
        
        if (setting.profile_id) query = query.eq('profile_id', setting.profile_id)
        else if (userId) query = query.eq('user_id', userId)
        else query = query.eq('guest_session_id', guestSessionId).is('user_id', null)

        const { data: tracking } = await query.maybeSingle()

        const section     = setting.section as string
        const isCompleted = tracking?.[COMPLETE_FIELD[section]] ?? false

        // Skip if already done
        if (isCompleted) {
          console.log(`[scheduler] Skipping ${section} for user ${userId || guestSessionId}: Task already completed.`)
          continue
        }

        // ── ANTI-SPAM: Min 2 hours since last reminder for this task ──
        const lastTimeStr = tracking?.[`last_${section}_reminder_at` as keyof typeof tracking] as string | undefined
        if (lastTimeStr) {
          const lastTime = new Date(lastTimeStr).getTime()
          if (Date.now() - lastTime < 2 * 60 * 60 * 1000) {
            console.log(`[scheduler] Skipping ${section} for user ${userId || guestSessionId}: Anti-spam window (sent < 2h ago).`)
            continue // Too soon, wait for next scheduled run
          }
        }

        const startMins = setting.start_time ? timeToMinutes(setting.start_time) : 0
        const endMins   = setting.end_time   ? timeToMinutes(setting.end_time)   : 23 * 60 + 59

        // Helper to fire nudge with increment
        const fireNudge = async (originalSlot: string) => {
          // Atomic increment + update last_reminder_at
          const { data: newCount } = await supabase.rpc('increment_task_reminder', {
            p_profile_id: setting.profile_id,
            p_date: date,
            p_task: section,
            p_user_id: userId,
            p_guest_id: guestSessionId
          })

          if (newCount && newCount !== -1) {
            const slot = newCount === 1 ? originalSlot : `${originalSlot}_nudge_${newCount}`
            await sendNotification(userId, guestSessionId, section, pickMessage(section), date, slot, setting.profile_id)
          }
        }

        // ── Water: interval-based ────────────────────────────────────────
        if (section === 'water' && setting.frequency_minutes) {
          if (nowMins >= startMins && nowMins <= endMins) {
            const elapsed   = nowMins - startMins
            const intervalIndex = Math.floor(elapsed / setting.frequency_minutes)
            
            if (intervalIndex >= 0) {
              const tMins = startMins + (intervalIndex * setting.frequency_minutes)
              if (nowMins >= tMins) {
                await fireNudge(`interval_${intervalIndex}`)
              }
            }
          }
          continue
        }

        // ── Diet: specific meal times ────────────────────────────────────
        if (section === 'diet' && setting.specific_times?.length) {
          for (const t of setting.specific_times) {
            if (!t || typeof t !== 'string') continue
            const tMins = timeToMinutes(t)
            if (nowMins >= tMins) {
              await fireNudge(`meal_${t}`)
            }
          }
          continue
        }

        // ── Others: fire after start time ──────────────────
        if (nowMins >= startMins) {
          await fireNudge('scheduled_start')
        }
      } catch (innerErr) {
        console.error(`[reminder-scheduler] Error processing setting ${setting.id}:`, innerErr)
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: settings.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[reminder-scheduler] fatal:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
