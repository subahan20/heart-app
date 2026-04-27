import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'

/**
 * useStreak
 * 
 * Fetches the current profile's streak information.
 */
export const useStreak = () => {
  // MINIMALIST SOURCE OF TRUTH: localStorage
  const profileId = localStorage.getItem('activeProfileId')

  return useQuery({
    queryKey: ['userStreak', profileId || aiService.getChatSessionId()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      if (!user && !guestSessionId) return null
 
      let query = supabase
        .from('user_streaks')
        .select(`
          streak_count,
          daily_completed,
          last_completed_date
        `)

      if (profileId) {
        query = query.eq('profile_id', profileId)
      } else if (user) {
        query = query.eq('user_id', user.id).is('profile_id', null)
      } else {
        query = query.eq('guest_session_id', guestSessionId)
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
