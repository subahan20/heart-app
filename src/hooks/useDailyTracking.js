import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'

/**
 * useDailyTracking
 * 
 * Comprehensive manager for daily health logs.
 * Returns sub-hooks and mutations for Diet, Sleep, Water, and Exercise.
 */
export function useDailyTracking() {
  const queryClient = useQueryClient()
  const profileId = localStorage.getItem('activeProfileId')

  /**
   * useDailyData
   * Fetches diet, sleep, water, and stress for a specific date.
   */
  const useDailyData = (date) => {
    return useQuery({
      queryKey: ['daily_data', date, profileId],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null

        const filters = profileId 
          ? { profile_id: profileId } 
          : { user_id: user?.id || null, guest_session_id: guestSessionId }

        const runQuery = (table) => {
          let q = supabase.from(table).select('*').eq('date', date)
          if (filters.profile_id) q = q.eq('profile_id', filters.profile_id)
          else q = q.eq('user_id', filters.user_id).is('profile_id', null)
          return q.maybeSingle()
        }

        const [diet, sleep, water, stress] = await Promise.all([
          runQuery('diet_plan'),
          runQuery('daily_sleep'),
          runQuery('daily_water'),
          runQuery('daily_stress')
        ])

        return {
          diet:   diet.data,
          sleep:  sleep.data,
          water:  water.data,
          stress: stress.data
        }
      },
      enabled: !!date,
      staleTime: 1000 * 60 * 5,
    })
  }

  /**
   * useHistoryData
   * Fetches history for Analytics.
   * @param {number|string} daysOrStart - Number of days or Start Date YYYY-MM-DD
   * @param {string} [endDate] - End Date YYYY-MM-DD
   */
  const useHistoryData = (daysOrStart, endDateStr) => {
    return useQuery({
      queryKey: ['history_data', daysOrStart, endDateStr, profileId],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null

        let start = daysOrStart
        let end = endDateStr || new Date().toISOString().split('T')[0]

        if (typeof daysOrStart === 'number') {
          const d = new Date()
          d.setDate(d.getDate() - daysOrStart)
          start = d.toISOString().split('T')[0]
        }

        const fetchTable = async (table) => {
          let q = supabase.from(table).select('*').gte('date', start).lte('date', end)
          if (profileId) q = q.eq('profile_id', profileId)
          else q = q.eq('user_id', user?.id || null).is('profile_id', null)
          const { data } = await q.order('date', { ascending: true })
          return data || []
        }

        const [diet, sleep, water, stress] = await Promise.all([
          fetchTable('diet_plan'),
          fetchTable('daily_sleep'),
          fetchTable('daily_water'),
          fetchTable('daily_stress')
        ])

        return { diet, sleep, water, stress }
      },
      enabled: !!daysOrStart
    })
  }

  // --- Mutations ---

  const createMutation = (table) => {
    return useMutation({
      mutationFn: async (payload) => {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null
        
        const fullPayload = {
          ...payload,
          profile_id: profileId || null,
          user_id: user?.id || null,
          guest_session_id: guestSessionId,
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from(table)
          .upsert(fullPayload, { onConflict: profileId ? 'profile_id,date' : 'user_id,guest_session_id,date' })
          .select()
          .single()

        if (error) throw error
        return data
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['daily_data', variables.date, profileId] })
        queryClient.invalidateQueries({ queryKey: ['history_data'] })
      }
    })
  }

  const dietMutation = createMutation('diet_plan')
  const waterMutation = createMutation('daily_water')
  const sleepMutation = createMutation('daily_sleep')
  const stressMutation = createMutation('daily_stress')

  return {
    useDailyData,
    useHistoryData,
    saveDietData: dietMutation.mutateAsync,
    saveWaterData: waterMutation.mutateAsync,
    saveSleepData: sleepMutation.mutateAsync,
    saveStressData: stressMutation.mutateAsync,
    isSaving: dietMutation.isPending || waterMutation.isPending || sleepMutation.isPending
  }
}
