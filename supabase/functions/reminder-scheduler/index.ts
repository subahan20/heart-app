// ============================================================
// supabase/functions/reminder-scheduler/index.ts
// Runs on a cron schedule (every 30 min recommended).
// Checks user_reminder_settings and sends notifications
// for incomplete tasks whose reminder time has come.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ── Time utilities ────────────────────────────────────────────────────────────
function nowInTz(tz: string): { hour: number; minute: number; dayOfWeek: string } {
  const now    = new Date()
  const locale = now.toLocaleString('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
  // locale: "Mon, 20:30"
  const [dayPart, timePart] = locale.split(', ')
  const [h, m]              = timePart.split(':').map(Number)
  return { hour: h, minute: m, dayOfWeek: dayPart.toLowerCase().slice(0, 3) }
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
  diet:     ["🥗 Time to log your meals!", "Don't forget your diet goals today 🍎", "Log your food intake 🍽️"],
  exercise: ["💪 Ready for your workout?", "Exercise time! Stay active 🏃", "Don't skip your workout today 🏋️"],
  water:    ["💧 Time to drink water!", "Stay hydrated! Have a glass of water 🥤", "Water reminder — sip up! 💧"],
  mental:   ["🧘 Take 5 minutes for breathing exercise", "Mental wellness check-in time 🌿", "Don't forget your stress management 🧠"],
  sleep:    ["😴 Time to wind down for sleep", "Good sleep = good health 🌙", "Prepare for a restful night 💤"],
}

function pickMessage(section: string): string {
  const pool = MESSAGES[section] ?? [`Reminder: ${section} goal incomplete`]
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Send notification ─────────────────────────────────────────────────────────
async function sendNotification(userId: string | null, guestSessionId: string | null, section: string, message: string, date: string, slot: string = 'default') {
  const { error } = await supabase.from('notifications').upsert({
    user_id:  userId,
    guest_session_id: guestSessionId,
    type:     'reminder',
    category: section,
    date,
    slot,
    title:    `${section.charAt(0).toUpperCase() + section.slice(1)} Reminder 🔔`,
    message,
    metadata: { section, goal: section, sent_at: new Date().toISOString() },
    is_read:  false,
  }, { onConflict: 'user_id,guest_session_id,date,category,type,slot', ignoreDuplicates: false })

  if (error) console.error(`[scheduler] notify error (${section}) slot(${slot}):`, error.message)
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
      const userId         = setting.user_id
      const guestSessionId = setting.guest_session_id
      const tz             = setting.timezone ?? 'Asia/Kolkata'
      const date           = todayStr(tz)
      const { hour, minute } = nowInTz(tz)
      const nowMins        = hour * 60 + minute

      // Skip if not today's repeat
      if (!shouldRunToday(setting, tz)) continue

      // 2. Fetch daily_tracking for today
      let query = supabase
        .from('daily_tracking')
        .select(`
          diet_completed, exercise_completed, water_completed, mental_completed, sleep_completed,
          diet_reminders_sent, exercise_reminders_sent, water_reminders_sent, mental_reminders_sent, sleep_reminders_sent,
          last_diet_reminder_at, last_exercise_reminder_at, last_water_reminder_at, last_mental_reminder_at, last_sleep_reminder_at
        `)
        .eq('date', date)
      
      if (userId) query = query.eq('user_id', userId)
      else query = query.eq('guest_session_id', guestSessionId).is('user_id', null)

      const { data: tracking } = await query.maybeSingle()

      const section     = setting.section as string
      const isCompleted = tracking?.[COMPLETE_FIELD[section]] ?? false

      // Skip if already done
      if (isCompleted) continue

      // ── ANTI-SPAM: Min 2 hours since last reminder for this task ──
      const lastTimeStr = tracking?.[`last_${section}_reminder_at` as keyof typeof tracking] as string | undefined
      if (lastTimeStr) {
        const lastTime = new Date(lastTimeStr).getTime()
        if (Date.now() - lastTime < 2 * 60 * 60 * 1000) {
          continue // Too soon, wait for next scheduled run
        }
      }

      const startMins = setting.start_time ? timeToMinutes(setting.start_time) : 0
      const endMins   = setting.end_time   ? timeToMinutes(setting.end_time)   : 23 * 60 + 59

      // Helper to fire nudge with increment
      const fireNudge = async (originalSlot: string) => {
        // Atomic increment + update last_reminder_at
        const { data: newCount } = await supabase.rpc('increment_task_reminder', {
          p_user_id: userId,
          p_guest_session_id: guestSessionId,
          p_date: date,
          p_task: section
        })

        if (newCount && newCount !== -1) {
          const slot = newCount === 1 ? originalSlot : `${originalSlot}_nudge_${newCount}`
          await sendNotification(userId, guestSessionId, section, pickMessage(section), date, slot)
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
    }

    return new Response(JSON.stringify({ ok: true, processed: settings.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[reminder-scheduler] fatal:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
