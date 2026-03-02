/**
 * useSectionCompletion.js
 *
 * React hook for marking daily health sections as complete.
 *
 * Features:
 *  - Reads today's `daily_tracking` row for the current user
 *  - Exposes `markComplete(section)` to update a specific section to TRUE
 *  - After all 5 are TRUE, the DB trigger auto-sets `all_completed = TRUE`
 *    and increments the cumulative streak via `increment_cumulative_streak()`
 *  - Exposes current completion state & streak for UI binding
 *
 * Sections: 'diet' | 'exercise' | 'sleep' | 'water' | 'mental'
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'
import { supabaseNotificationService } from '../services/supabaseNotifications'

const TODAY = () => new Date().toISOString().split('T')[0]

// ── Helper: get user identity (authenticated or guest) ────────────────────────
async function getUserIdentity() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const guestSessionId = !user ? aiService.getChatSessionId() : null
  return { user, guestSessionId }
}

// ── Helper: build supabase filter for current user ────────────────────────────
function applyUserFilter(query, user, guestSessionId) {
  if (user) {
    return query.eq('user_id', user.id)
  }
  return query.eq('guest_session_id', guestSessionId).is('user_id', null)
}

// ─────────────────────────────────────────────────────────────────────────────
// useSectionCompletion()
// ─────────────────────────────────────────────────────────────────────────────
export function useSectionCompletion() {
  const queryClient = useQueryClient()
  const today = TODAY()

  // ── Query: today's daily_tracking row ─────────────────────────────────────
  const trackingQuery = useQuery({
    queryKey: ['daily_tracking', today],
    queryFn: async () => {
      const { user, guestSessionId } = await getUserIdentity()
      if (!user && !guestSessionId) return null

      let query = supabase
        .from('daily_tracking')
        .select(
          'id, date, diet_completed, exercise_completed, sleep_completed, water_completed, mental_completed, all_completed'
        )
        .eq('date', today)

      query = applyUserFilter(query, user, guestSessionId)
      const { data, error } = await query.maybeSingle()

      if (error) {
        console.error('[useSectionCompletion] Error fetching daily_tracking:', error)
        throw error
      }

      return data
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  })

  // ── Query: current streak ─────────────────────────────────────────────────
  const streakQuery = useQuery({
    queryKey: ['userStreak', aiService.getChatSessionId()],
    queryFn: async () => {
      const { user, guestSessionId } = await getUserIdentity()
      if (!user && !guestSessionId) return null

      let query = supabase
        .from('patient_streak')
        .select(
          'streak_count, daily_completed, last_completed_date, patient_details!inner(user_id, guest_session_id)'
        )

      if (user) {
        query = query.eq('patient_details.user_id', user.id)
      } else {
        query = query.eq('patient_details.guest_session_id', guestSessionId)
      }

      const { data, error } = await query.maybeSingle()
      if (error) {
        console.error('[useSectionCompletion] Error fetching streak:', error)
        throw error
      }

      return {
        count: data?.streak_count ?? 0,
        isCompleted: data?.daily_completed ?? false,
        lastCompletedDate: data?.last_completed_date ?? null,
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  // ── Mutation: mark a section complete ────────────────────────────────────
  const markCompleteMutation = useMutation({
    /**
     * @param {'diet'|'exercise'|'sleep'|'water'|'mental'} section
     */
    mutationFn: async (section) => {
      const validSections = ['diet', 'exercise', 'sleep', 'water', 'mental']
      if (!validSections.includes(section)) {
        throw new Error(`Invalid section: "${section}". Must be one of: ${validSections.join(', ')}`)
      }

      const { user, guestSessionId } = await getUserIdentity()
      if (!user && !guestSessionId) throw new Error('No authenticated user or guest session found.')

      const columnName = `${section}_completed`
      const payload = {
        user_id: user?.id ?? null,
        guest_session_id: guestSessionId,
        date: today,
        [columnName]: true,
        updated_at: new Date().toISOString(),
      }

      // Upsert: creates the row if it doesn't exist yet, updates if it does.
      const { data, error } = await supabase
        .from('daily_tracking')
        .upsert(payload, {
          onConflict: 'user_id,guest_session_id,date',
          ignoreDuplicates: false,
        })
        .select()
        .maybeSingle()

      if (error) {
        console.error(`[useSectionCompletion] Error marking ${section} complete:`, error)
        throw error
      }

      return { section, data }
    },

    onSuccess: async ({ section }) => {
      console.log(`[useSectionCompletion] ✅ ${section} marked complete for ${today}`)

      // ── Instant success notification (client-side — no cron wait) ──────────
      const SUCCESS_MESSAGES = {
        diet:     '🍎 Diet completed successfully! Great nutritional choices today.',
        exercise: '💪 Great job completing your workout today! Keep it up!',
        sleep:    '😴 Sleep log updated! Rest well and recover strong.',
        water:    '💧 Hydration goal achieved! Your body thanks you.',
        mental:   '🧘 Mental wellness check done! You are taking great care of yourself.',
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null
        const userId = user?.id ?? null

        // Insert success notification immediately
        await supabaseNotificationService.createNotification(
          userId,
          guestSessionId,
          section,
          'success',
          `${section.charAt(0).toUpperCase() + section.slice(1)} Completed! 🎉`,
          SUCCESS_MESSAGES[section] ?? `${section} completed for today!`,
          { task: section, event: 'success', sent_by: 'client' }
        )

        // Mark success_sent flag in DB so edge function doesn't double-send
        if (userId) {
          await supabase.rpc('mark_task_success_sent', {
            p_user_id: userId,
            p_date:    today,
            p_task:    section,
          })
        }
      } catch (notifErr) {
        // Non-critical — edge function will handle it on next run
        console.warn('[useSectionCompletion] Success notification failed (non-fatal):', notifErr)
      }

      // Invalidate tracking & streak queries so UI re-renders
      queryClient.invalidateQueries({ queryKey: ['daily_tracking', today] })
      queryClient.invalidateQueries({ queryKey: ['userStreak'] })
      queryClient.invalidateQueries({ queryKey: ['daily_data', today] })

      // Emit legacy events for backward compatibility
      const legacyEventMap = {
        diet:     'dietDataUpdated',
        exercise: 'exerciseDataUpdated',
        sleep:    'sleepDataUpdated',
        water:    'waterDataUpdated',
        mental:   'stressDataUpdated',
      }
      if (legacyEventMap[section]) {
        window.dispatchEvent(new CustomEvent(legacyEventMap[section]))
      }
    },

    onError: (error, section) => {
      console.error(`[useSectionCompletion] Failed to mark "${section}" complete:`, error)
    },
  })

  // ── Derived state ─────────────────────────────────────────────────────────
  const tracking = trackingQuery.data
  const completionState = {
    diet:     tracking?.diet_completed     ?? false,
    exercise: tracking?.exercise_completed ?? false,
    sleep:    tracking?.sleep_completed    ?? false,
    water:    tracking?.water_completed    ?? false,
    mental:   tracking?.mental_completed   ?? false,
    all:      tracking?.all_completed      ?? false,
  }

  const completedCount = Object.values(completionState)
    .slice(0, 5)
    .filter(Boolean).length

  return {
    // Completion state
    completionState,
    completedCount,          // 0–5
    isFullyComplete: completionState.all,

    // Streak
    streak: streakQuery.data ?? { count: 0, isCompleted: false, lastCompletedDate: null },
    isStreakLoading: streakQuery.isLoading,

    // Actions
    /**
     * Mark a section as complete.
     * @param {'diet'|'exercise'|'sleep'|'water'|'mental'} section
     */
    markComplete: (section) => markCompleteMutation.mutate(section),
    markCompleteAsync: (section) => markCompleteMutation.mutateAsync(section),

    // Loading & error states
    isLoading:     trackingQuery.isLoading || streakQuery.isLoading,
    isMarking:     markCompleteMutation.isPending,
    isError:       trackingQuery.isError || streakQuery.isError,
    error:         trackingQuery.error ?? streakQuery.error ?? markCompleteMutation.error,
    
    // Raw query access if needed
    refetch: trackingQuery.refetch,
  }
}
