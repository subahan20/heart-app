import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'

/**
 * useStreak
 * 
 * Fetches the current user's streak information from patient_details.
 * Read-only as per production requirements.
 */
export const useStreak = () => {
  return useQuery({
    queryKey: ['userStreak', aiService.getChatSessionId()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      if (!user && !guestSessionId) return null
 
      let query = supabase
        .from('patient_streak')
        .select(`
          streak_count,
          daily_completed,
          last_completed_date,
          patient_details!inner(user_id, guest_session_id)
        `)

      if (user) {
        query = query.eq('patient_details.user_id', user.id)
      } else {
        query = query.eq('patient_details.guest_session_id', guestSessionId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) {
        console.error('Error fetching streak:', error)
        throw error
      }

      return {
        count: data?.streak_count || 0,
        isCompleted: data?.daily_completed || false,
        lastCompletedDate: data?.last_completed_date || null
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  })
}
