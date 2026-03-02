import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────────────────────
// daily-reminder/index.ts  (v2 — Smart per-task notification system)
//
// Cron schedule: every 30–60 minutes via pg_cron / Supabase dashboard.
//
// Responsibilities per run:
//   1. Seed daily_tracking rows at 12:01 AM IST (random limits 5–10 per task).
//   2. For each user × each task:
//      A. Task COMPLETED + success NOT sent → send success msg, mark flag.
//      B. Task NOT completed + reminders < limit + time 7AM–9PM → send reminder.
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Task definitions ──────────────────────────────────────────────────────────
const TASKS = ['diet', 'exercise', 'sleep', 'water', 'mental'] as const
type Task = typeof TASKS[number]

// ── Per-task reminder message pools ──────────────────────────────────────────
const REMINDER_MESSAGES: Record<Task, string[]> = {
  diet: [
    "🍎 Your diet log is still pending — log your meals now!",
    "🥗 Don't forget to track your food intake today.",
    "🍽️ Healthy eating tracked = healthy heart. Add your diet log!",
    "🥦 Your nutrition matters — complete the diet section!",
    "🫐 Quick reminder: your diet tracking is incomplete today.",
  ],
  exercise: [
    "💪 No workout logged yet — move that body!",
    "🏃 Your exercise section is incomplete. Time to get active!",
    "🏋️ A quick workout is better than none — log it today!",
    "🚴 Exercise tracking reminder — you got this!",
    "⚡ Your daily activity hasn't been logged yet. Let's go!",
  ],
  sleep: [
    "😴 Sleep log missing — track your rest for better health.",
    "🌙 Your sleep hasn't been logged today. Don't skip it!",
    "💤 Quality sleep = quality life. Log your sleep now!",
    "🛌 Reminder: your sleep tracking is pending.",
    "🌟 Track your sleep — it's key to heart health!",
  ],
  water: [
    "💧 Stay hydrated! Your water intake hasn't been logged.",
    "🚰 Water tracking reminder — drink up and log it!",
    "💦 Hydration goal not met yet. Track your water intake!",
    "🫗 Don't forget water! Log your intake for today.",
    "💙 Staying hydrated keeps your heart healthy — log it!",
  ],
  mental: [
    "🧘 Your mental wellness check-in is pending.",
    "🌿 Take a moment for yourself — complete the mental health section.",
    "🧠 Mental health matters. Don't skip today's check-in!",
    "🌈 A quick mental wellness log = a happier you.",
    "☁️ Stress check-in reminder — your mental health needs attention too!",
  ],
}

// ── Per-task success message pools ───────────────────────────────────────────
const SUCCESS_MESSAGES: Record<Task, string> = {
  diet:     "🍎 Diet completed successfully! Great nutritional choices today.",
  exercise: "💪 Great job completing your workout today! Keep it up!",
  sleep:    "😴 Sleep log updated! Rest well and recover strong.",
  water:    "💧 Hydration goal achieved! Your body thanks you.",
  mental:   "🧘 Mental wellness check done! You're taking great care of yourself.",
}

// ── IST time helpers ────────────────────────────────────────────────────────
function getISTHour(): number {
  const nowUtc = new Date()
  const istMs  = nowUtc.getTime() + (5 * 60 + 30) * 60 * 1000
  return new Date(istMs).getUTCHours()
}

function getISTDateString(): string {
  const nowUtc = new Date()
  const istMs  = nowUtc.getTime() + (5 * 60 + 30) * 60 * 1000
  return new Date(istMs).toISOString().split('T')[0]
}

function isStartOfDay(): boolean {
  const nowUtc = new Date()
  const istMs  = nowUtc.getTime() + (5 * 60 + 30) * 60 * 1000
  const ist    = new Date(istMs)
  return ist.getUTCHours() === 0 && ist.getUTCMinutes() <= 10
}

function isReminderWindow(): boolean {
  const h = getISTHour()
  return h >= 7 && h < 21  // 7 AM – 9 PM IST
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const today    = getISTDateString()
    const istHour  = getISTHour()
    const inWindow = isReminderWindow()

    console.log(`[daily-reminder v2] IST date=${today} hour=${istHour} window=${inWindow} startOfDay=${isStartOfDay()}`)

    // ── Step 1: Midnight seeding ──────────────────────────────────────────────
    if (isStartOfDay()) {
      console.log('[daily-reminder v2] Seeding daily_tracking rows...')
      const { error: seedErr } = await supabase.rpc('populate_daily_tracking')
      if (seedErr) console.error('[daily-reminder v2] Seed error:', seedErr.message)
      else         console.log('[daily-reminder v2] Seed complete.')
    }

    // ── Step 2: Fetch all users (authed + active guests) ──────────────────────
    const { data: users, error: usersErr } = await supabase
      .from('patient_details')
      .select('user_id, guest_session_id')

    if (usersErr) throw usersErr

    console.log(`[daily-reminder v2] Processing ${users?.length ?? 0} identities`)

    const results: Array<Record<string, unknown>> = []

    for (const { user_id, guest_session_id } of users ?? []) {
      try {
        // ── Fetch today's tracking row ────────────────────────────────────────
        let query = supabase
          .from('daily_tracking')
          .select(`
            diet_completed,     exercise_completed,     sleep_completed,     water_completed,     mental_completed,
            diet_reminders_sent, exercise_reminders_sent, sleep_reminders_sent, water_reminders_sent, mental_reminders_sent,
            diet_success_sent,   exercise_success_sent,   sleep_success_sent,   water_success_sent,   mental_success_sent,
            diet_reminder_limit, exercise_reminder_limit, sleep_reminder_limit, water_reminder_limit, mental_reminder_limit,
            last_diet_reminder_at, last_exercise_reminder_at, last_sleep_reminder_at, last_water_reminder_at, last_mental_reminder_at
          `)
          .eq('date', today)

        if (user_id) {
          query = query.eq('user_id', user_id)
        } else {
          query = query.eq('guest_session_id', guest_session_id).is('user_id', null)
        }

        const { data: row } = await query.maybeSingle()

        // ── Fetch user reminder settings ──────────────────────────────────────
        let settingsQuery = supabase
          .from('user_reminder_settings')
          .select('section, is_enabled')
        
        if (user_id) {
          settingsQuery = settingsQuery.eq('user_id', user_id)
        } else {
          settingsQuery = settingsQuery.eq('guest_session_id', guest_session_id).is('user_id', null)
        }

        const { data: settings } = await settingsQuery

        if (!row) {
          // No tracking row yet — seed on demand
          console.log(`[daily-reminder v2] No tracking row for user=${user_id || guest_session_id}. Seeding.`)
          await supabase.from('daily_tracking').upsert(
            { user_id, guest_session_id, date: today },
            { onConflict: 'user_id,guest_session_id,date' }
          )
          results.push({ user_id, guest_session_id, status: 'seeded_on_demand' })
          continue
        }

        const userResults: Record<string, string> = {}

        // ── Per-task logic ────────────────────────────────────────────────────
        for (const task of TASKS) {
          const completed     = row[`${task}_completed`]     as boolean
          const successSent   = row[`${task}_success_sent`]   as boolean
          const remindersSent = row[`${task}_reminders_sent`] as number
          const reminderLimit = row[`${task}_reminder_limit`] as number
          const lastReminder  = row[`last_${task}_reminder_at`] as string | null

          const hasSettingEnabled = settings?.some((s: any) => s.section === task && s.is_enabled) ?? false

          // ── A: Task just completed — send ONE success notification ──────────
          if (completed && !successSent) {
            const { data: marked } = await supabase.rpc('mark_task_success_sent', {
              p_user_id:           user_id,
              p_guest_session_id:  guest_session_id,
              p_date:              today,
              p_task:              task,
            })

            if (marked === true) {
              await supabase.from('notifications').insert({
                user_id,
                guest_session_id,
                date:             today,
                category:         task,
                type:             'success',
                slot:             'completion',
                title:            `${task.charAt(0).toUpperCase() + task.slice(1)} Completed! 🎉`,
                message:          SUCCESS_MESSAGES[task],
                is_read:          false,
                is_ai_generated:  false,
                metadata:         { task, event: 'success', sent_by: 'edge_function' },
              })
              userResults[task] = 'success_sent'
            }
            continue
          }

          if (completed && successSent) {
            userResults[task] = 'completed_done'
            continue
          }

          // ── C: Task NOT completed — send reminder if in window and under cap ─
          if (!completed) {
            // SKIP if user has an enabled custom setting for this section
            // (The reminder-scheduler will handle the specific timing instead)
            if (hasSettingEnabled) {
              userResults[task] = 'handled_by_settings'
              continue
            }

            if (!inWindow) {
              userResults[task] = 'outside_window'
              continue
            }

            if (remindersSent >= reminderLimit) {
              userResults[task] = `capped(${remindersSent}/${reminderLimit})`
              continue
            }

            // ── ANTI-SPAM: Min 2 hours since last reminder ──
            if (lastReminder) {
              const lastTime = new Date(lastReminder).getTime()
              if (Date.now() - lastTime < 2 * 60 * 60 * 1000) {
                userResults[task] = 'too_soon'
                continue
              }
            }

            // Atomically increment counter
            const { data: newCount } = await supabase.rpc('increment_task_reminder', {
              p_user_id:           user_id,
              p_guest_session_id:  guest_session_id,
              p_date:              today,
              p_task:              task,
            })

            if (!newCount || newCount === -1) {
              userResults[task] = 'increment_failed'
              continue
            }

            // Send reminder notification
            const message = randomFrom(REMINDER_MESSAGES[task])
            await supabase.from('notifications').insert({
              user_id,
              guest_session_id,
              date:             today,
              category:         task,
              type:             'reminder',
              slot:             `catch_all_${newCount}`,
              title:            `${task.charAt(0).toUpperCase() + task.slice(1)} Reminder 🔔`,
              message,
              is_read:          false,
              is_ai_generated:  false,
              metadata:         { task, event: 'reminder', count: newCount, limit: reminderLimit },
            })

            userResults[task] = `reminder_sent(${newCount}/${reminderLimit})`
          }
        } // end per-task loop

        results.push({ user_id: user_id || guest_session_id, tasks: userResults })

      } catch (userErr) {
        console.error(`[daily-reminder v2] Error processing user=${user_id}:`, (userErr as Error).message)
        results.push({ user_id, status: 'error', error: (userErr as Error).message })
      }
    } // end per-user loop

    return new Response(
      JSON.stringify({ success: true, date: today, ist_hour: istHour, processed_users: users?.length ?? 0, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[daily-reminder v2] Fatal error:', (error as Error).message)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
