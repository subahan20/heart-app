import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'
import { toast } from 'react-toastify'

const MAX_ROUNDS  = 5
const TIMER_SECS  = 120   // 2-minute breathing session

export function useBreathingExercise(selectedDate) {
  const today  = new Date().toISOString().split('T')[0]
  const date   = selectedDate || today
  const isPast = date < today

  // ── Single flat state object ─────────────────────────────────────────────
  const [state, setState] = useState({
    roundsCompleted: 0,
    isLoading:       true,
    isSaving:        false,
    timerActive:     false,
    timerSeconds:    TIMER_SECS,
    timerCompleted:  false,
    userId:          null,
    guestSessionId:  null,
  })

  const timerRef    = useRef(null)
  const savingGuard = useRef(false)

  const patch = useCallback(
    (partial) => setState(prev => ({ ...prev, ...partial })),
    []
  )

  // ── Fetch rounds from daily_stress ────────────────────────────────────────
  const fetchRounds = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId         = user?.id ?? null
      const guestSessionId = !user ? aiService.getChatSessionId() : null

      let query = supabase
        .from('daily_stress')
        .select('breathing_sessions')
        .eq('date', date)

      if (userId) {
        query = query.eq('user_id', userId)
      } else {
        query = query.eq('guest_session_id', guestSessionId).is('user_id', null)
      }

      const { data, error } = await query.maybeSingle()

      // Column not yet added — silently use 0 (run migration 060 to fix)
      if (error?.code === '42703') {
        console.warn('[useBreathingExercise] breathing_sessions column missing. Run migration 060.')
        patch({ roundsCompleted: 0, userId, guestSessionId, isLoading: false })
        return
      }
      if (error) throw error

      patch({
        roundsCompleted: data?.breathing_sessions ?? 0,
        userId,
        guestSessionId,
        isLoading: false,
      })
    } catch (err) {
      console.error('[useBreathingExercise] fetchRounds error:', err)
      patch({ isLoading: false })
    }
  }, [date])


  useEffect(() => { fetchRounds() }, [fetchRounds])

  // ── Timer ────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (state.timerActive || state.roundsCompleted >= MAX_ROUNDS || isPast) return
    patch({ timerActive: true, timerSeconds: TIMER_SECS, timerCompleted: false })
  }, [state.timerActive, state.roundsCompleted, isPast])

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current)
    patch({ timerActive: false, timerSeconds: TIMER_SECS, timerCompleted: false })
  }, [])

  useEffect(() => {
    if (!state.timerActive) return
    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timerSeconds <= 1) {
          clearInterval(timerRef.current)
          return { ...prev, timerActive: false, timerSeconds: 0, timerCompleted: true }
        }
        return { ...prev, timerSeconds: prev.timerSeconds - 1 }
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [state.timerActive])

  // ── Save round → daily_stress only ───────────────────────────────────────
  const saveRound = useCallback(async () => {
    if (savingGuard.current || isPast || state.isSaving) return
    if (!state.timerCompleted) return
    if (state.roundsCompleted >= MAX_ROUNDS) {
      toast.info("You have already completed today's breathing exercise 🌿")
      return
    }

    savingGuard.current = true
    patch({ isSaving: true })

    try {
      // ── Select → Update or Insert (avoids onConflict NULL issues) ─────────
      const { userId, guestSessionId, roundsCompleted } = state
      const newCount = Math.min(roundsCompleted + 1, MAX_ROUNDS)

      // Build the base match for this user + date
      let checkQuery = supabase
        .from('daily_stress')
        .select('id')
        .eq('date', date)

      if (userId) {
        checkQuery = checkQuery.eq('user_id', userId)
      } else {
        checkQuery = checkQuery.eq('guest_session_id', guestSessionId).is('user_id', null)
      }

      const { data: existing, error: checkErr } = await checkQuery.maybeSingle()
      if (checkErr && checkErr.code !== 'PGRST116') throw checkErr

      const stressPayload = {
        date,
        breathing_sessions: newCount,
        stress_level:       Math.max(1, 3 - Math.floor(newCount / 2)),
        notes:              `Completed ${newCount} breathing round(s)`,
      }

      if (existing?.id) {
        // Row exists — UPDATE
        const { error: updErr } = await supabase
          .from('daily_stress')
          .update(stressPayload)
          .eq('id', existing.id)
        if (updErr) throw updErr
      } else {
        // No row yet — INSERT
        const insertPayload = {
          ...stressPayload,
          user_id:          userId,
          guest_session_id: guestSessionId ?? null,
        }
        const { error: insErr } = await supabase
          .from('daily_stress')
          .insert(insertPayload)
        if (insErr) throw insErr
      }

      // ── If 5/5 reached, mark mental_completed in daily_tracking ────────
      if (newCount >= MAX_ROUNDS && userId) {
        await supabase
          .from('daily_tracking')
          .update({ mental_completed: true })
          .eq('user_id', userId)
          .eq('date', date)
      }


      patch({
        roundsCompleted: newCount,
        timerCompleted:  false,
        timerSeconds:    TIMER_SECS,
        isSaving:        false,
      })

      if (newCount >= MAX_ROUNDS) {
        toast.success('Breathing goal achieved for today 🧘‍♂️', {
          toastId: `breathing-done-${date}`,
        })
      } else {
        toast.success(`✅ Round ${newCount}/${MAX_ROUNDS} saved!`)
      }
    } catch (err) {
      console.error('[useBreathingExercise] saveRound error:', err)
      toast.error('Failed to save round')
      patch({ isSaving: false })
    } finally {
      savingGuard.current = false
    }
  }, [state, date, isPast])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return {
    roundsCompleted: state.roundsCompleted,
    isLoading:       state.isLoading,
    isSaving:        state.isSaving,
    timerActive:     state.timerActive,
    timerSeconds:    state.timerSeconds,
    timerCompleted:  state.timerCompleted,
    isAllDone:       state.roundsCompleted >= MAX_ROUNDS,
    isPast,
    MAX_ROUNDS,
    TIMER_SECS,
    startTimer,
    resetTimer,
    saveRound,
    formatTime,
    refetch: fetchRounds,
  }
}
