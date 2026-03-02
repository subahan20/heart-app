// supabase/functions/daily-health-check/index.js
// Daily Health Tracking Notification Edge Function
// Runs at 8 PM IST via pg_cron to evaluate today's activity and
// insert a success or warning notification per authenticated user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use service-role key so we can read all users' data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } }
    )

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // ── Step 1: Collect all user IDs that have any tracking record today ──
    const tables = ['diet_plan', 'daily_exercise', 'daily_water', 'daily_stress', 'daily_sleep']
    const userIdSets = await Promise.all(
      tables.map(async (table) => {
        // All daily tracking tables use 'date' column
        const { data } = await supabase
          .from(table)
          .select('user_id')
          .eq('date', today)
          .not('user_id', 'is', null)
        return (data || []).map((r) => r.user_id)
      })
    )

    // Deduplicate user IDs across all tables
    const allUserIds = [...new Set(userIdSets.flat())]

    if (allUserIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users tracked today', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0]

    // ── Step 2: For each user, fetch tracking data and evaluate streak ──
    const results = await Promise.all(
      allUserIds.map(async (userId) => {
        try {
          const [diet, exercise, water, stress, sleep, profile] = await Promise.all([
            supabase.from('diet_plan').select('total_calories').eq('date', today).eq('user_id', userId).maybeSingle(),
            supabase.from('daily_exercise').select('total_minutes').eq('date', today).eq('user_id', userId).maybeSingle(),
            supabase.from('daily_water').select('glasses').eq('date', today).eq('user_id', userId).maybeSingle(),
            supabase.from('daily_stress').select('stress_level').eq('date', today).eq('user_id', userId).maybeSingle(),
            supabase.from('daily_sleep').select('duration_hours').eq('date', today).eq('user_id', userId).maybeSingle(),
            supabase.from('patient_details').select('streak_count, last_completed_date').eq('user_id', userId).maybeSingle()
          ])

          // ── Compute 5 completion booleans ──
          const dietCompleted     = (diet.data?.total_calories ?? 0) >= 1200
          const exerciseCompleted = (exercise.data?.total_minutes ?? 0) >= 20
          const waterCompleted    = (water.data?.glasses ?? 0) >= 6
          const stressCompleted   = (stress.data?.stress_level ?? 5) <= 3
          const sleepCompleted    = (sleep.data?.duration_hours ?? 0) >= 7

          const allCompleted = dietCompleted && exerciseCompleted && waterCompleted && stressCompleted && sleepCompleted

          // ── Streak Logic ── 
          // Default to 0 based on user request ("put starting zero")
          let newStreakCount = 0 
          let newLastCompletedDate = profile.data?.last_completed_date
          const currentStreak = profile.data?.streak_count ?? 0
          const currentLastDate = profile.data?.last_completed_date

          if (allCompleted) {
            if (currentLastDate === today) {
              // Rule: Already achieved today
              newStreakCount = currentStreak
              console.log(`User ${userId} already completed today. Streak at ${newStreakCount}`)
            } else if (currentLastDate === yesterday) {
              // Rule: Consistency! Increment from previous value
              newStreakCount = currentStreak + 1
              newLastCompletedDate = today
              console.log(`User ${userId} incremental success: ${currentStreak} -> ${newStreakCount}`)
            } else {
              // Rule: First time or recovery after gap
              newStreakCount = 1
              newLastCompletedDate = today
              console.log(`User ${userId} starting fresh streak: 1`)
            }
          } else {
            // Rule: Reset to 0 if any task is missing
            newStreakCount = 0
            console.log(`User ${userId} reset to 0 (missing tasks)`)
          }

          // ── Update Profile ──
          if (newStreakCount !== currentStreak || newLastCompletedDate !== currentLastDate) {
            await supabase.from('patient_details').update({
              streak_count: newStreakCount,
              last_completed_date: newLastCompletedDate
            }).eq('user_id', userId)
          }

          // ── Upsert tracking summary ──
          await supabase.from('user_daily_tracking').upsert(
            {
              user_id: userId,
              date: today,
              diet_completed: dietCompleted,
              exercise_completed: exerciseCompleted,
              water_completed: waterCompleted,
              stress_completed: stressCompleted,
              sleep_completed: sleepCompleted,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id,guest_session_id,date' }
          )

          // ── Notification ──
          const notificationType = allCompleted ? 'daily_success' : 'daily_warning'
          const title = allCompleted ? `🔥 ${newStreakCount} Day Streak!` : 'Daily Health Goal ⚠️'
          const message = allCompleted
            ? `Excellent! You've met all your goals. Your streak is now ${newStreakCount}!`
            : buildReminderMessage(dietCompleted, exerciseCompleted, waterCompleted, stressCompleted, sleepCompleted)

          const { error: notifError } = await supabase.from('notifications').upsert(
            {
              user_id: userId,
              guest_session_id: null,
              date: today,
              type: allCompleted ? 'congratulations' : 'warning',
              notification_type: notificationType,
              category: 'daily_summary',
              title,
              message,
              is_read: false,
              metadata: {
                diet_completed, exercise_completed, water_completed, stress_completed, sleep_completed,
                streak_count: newStreakCount
              }
            },
            { onConflict: 'user_id,guest_session_id,date,category,type' }
          )
          
          if (notifError && notifError.code !== '23505') {
            console.error(`Notification upsert failed for ${userId}:`, notifError)
          }

          return { userId, newStreakCount }
        } catch (err) {
          console.error(`Error processing user ${userId}:`, err)
          return { userId, error: err.message }
        }
      })
    )

    const processed = results.filter((r) => !r.error).length
    const errors    = results.filter((r) => r.error).length

    return new Response(
      JSON.stringify({ message: 'Daily streak processing complete', processed, errors, today }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error('Fatal error in daily-health-check:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

/**
 * Build a specific reminder message listing incomplete goals.
 */
function buildReminderMessage(diet, exercise, water, stress, sleep) {
  const incomplete = []
  if (!diet)     incomplete.push('nutrition 🥗')
  if (!exercise) incomplete.push('exercise 🏃')
  if (!water)    incomplete.push('hydration 💧')
  if (!stress)   incomplete.push('stress management 🧘')
  if (!sleep)    incomplete.push('sleep 😴')

  if (incomplete.length === 5) {
    return 'You have not completed any of your daily health tasks yet today.'
  }
  return `Almost there! You still need to complete: ${incomplete.join(', ')}.`
}
