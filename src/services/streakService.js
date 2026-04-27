import { supabase } from './supabase'

export class StreakService {
  // Get current streak count
  async getCurrentStreak(userId, guestSessionId, profileId) {
    try {
      let query = supabase
        .from('profiles')
        .select('streak_count')

      if (profileId) {
        query = query.eq('id', profileId)
      } else if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) {
        console.error('Error getting current streak:', error)
        return 0
      }

      return data?.streak_count || 0
    } catch (error) {
      console.error('Failed to get current streak:', error)
      return 0
    }
  }

  // Update streak count
  async updateStreak(userId, guestSessionId, newStreakCount, lastStreakDate = null, profileId) {
    try {
      const updateData = {
        streak_count: newStreakCount,
        updated_at: new Date().toISOString()
      }

      if (lastStreakDate) {
        updateData.last_streak_date = lastStreakDate
      }

      let query = supabase
        .from('profiles')
        .update(updateData)
      
      if (profileId) {
        query = query.eq('id', profileId)
      } else {
        query = query.eq(userId ? 'user_id' : 'guest_session_id', userId || guestSessionId)
      }

      const { data, error } = await query.select().maybeSingle()

      if (error) {
        console.error('Error updating streak:', error)
        throw error
      }

      console.log('✅ Streak updated:', { newStreakCount, lastStreakDate })
      return data
    } catch (error) {
      console.error('Failed to update streak:', error)
      throw error
    }
  }

  // Check and update daily streak
  async checkAndUpdateDailyStreak(userId, guestSessionId, dailyMetrics, profileId) {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Check if all activities are completed
      const allCompleted = 
        dailyMetrics.water >= (dailyMetrics.waterGoal || 12) &&
        dailyMetrics.calories >= (dailyMetrics.caloriesGoal || 2000) &&
        dailyMetrics.exercise >= (dailyMetrics.exerciseGoal || 30) &&
        (5 - dailyMetrics.stressLevel) >= 4 &&
        dailyMetrics.sleep >= (dailyMetrics.sleepGoal || 8)
      
      console.log('🔍 Checking daily streak:', { allCompleted, dailyMetrics })
      
      if (allCompleted) {
        // Check if streak already updated today
        let query = supabase
          .from('daily_streaks')
          .select('*')
          .eq('date', today)

        if (profileId) {
          query = query.eq('profile_id', profileId)
        } else {
          query = query.eq(userId ? 'user_id' : 'guest_session_id', userId || guestSessionId)
        }

        const { data: existingStreak } = await query.maybeSingle()

        if (!existingStreak) {
          // DATABASE TRIGGER handles the streak increment automatically
          console.log('🎉 All activities completed for today! Streak will be updated by server.')
          return { isNewRecord: true }
        }
      } else {
        // Check if streak should be reset (no activities completed by end of day)
        const currentHour = new Date().getHours()
        if (currentHour >= 23) { // Check at 11 PM
          let query = supabase
            .from('daily_streaks')
            .select('*')
            .eq('date', today)

          if (profileId) {
            query = query.eq('profile_id', profileId)
          } else {
            query = query.eq(userId ? 'user_id' : 'guest_session_id', userId || guestSessionId)
          }

          const { data: todayStreak } = await query.maybeSingle()
          
          if (!todayStreak) {
            // Reset streak to 0
            await this.updateStreak(userId, guestSessionId, 0, null, profileId)
            console.log('💔 Streak reset to 0')
            return { streakCount: 0, isReset: true }
          }
        }
      }
      
      // Get current streak count
      const currentStreak = await this.getCurrentStreak(userId, guestSessionId, profileId)
      return { streakCount: currentStreak, isNewRecord: false, isReset: false }
    } catch (error) {
      console.error('Failed to check and update daily streak:', error)
      return { streakCount: 0, error }
    }
  }

  // Get streak history
  async getStreakHistory(userId, guestSessionId, days = 30, profileId) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      let query = supabase
        .from('daily_streaks')
        .select('*')
        .gte('date', startDate)
        .order('date', { ascending: false })

      if (profileId) {
        query = query.eq('profile_id', profileId)
      } else if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting streak history:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to get streak history:', error)
      return []
    }
  }

  // Get longest streak
  async getLongestStreak(userId, guestSessionId, profileId) {
    try {
      let query = supabase
        .from('daily_streaks')
        .select('streak_count')
        .order('streak_count', { ascending: false })
        .limit(1)

      if (profileId) {
        query = query.eq('profile_id', profileId)
      } else if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting longest streak:', error)
        return 0
      }

      return data?.[0]?.streak_count || 0
    } catch (error) {
      console.error('Failed to get longest streak:', error)
      return 0
    }
  }

  // Subscribe to real-time streak updates
  subscribeToStreakUpdates(userId, guestSessionId, callback, profileId) {
    try {
      const subscriptionKey = profileId || userId || guestSessionId || 'anonymous'
      
      const subscription = supabase
        .channel(`streak_updates_${subscriptionKey}`)
        .on('postgres_changes', 
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: profileId 
              ? `id=eq.${profileId}`
              : userId 
              ? `user_id=eq.${userId}`
              : guestSessionId
              ? `guest_session_id=eq.${guestSessionId}`
              : undefined
          },
          (payload) => {
            console.log('🔥 Real-time streak update:', payload)
            callback(payload)
          }
        )
        .subscribe()
      
      console.log(`✅ Subscribed to streak updates for: ${subscriptionKey}`)
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to streak updates:', error)
      throw error
    }
  }

  // Calculate streak statistics
  async getStreakStats(userId, guestSessionId) {
    try {
      const [currentStreak, longestStreak, history] = await Promise.all([
        this.getCurrentStreak(userId, guestSessionId),
        this.getLongestStreak(userId, guestSessionId),
        this.getStreakHistory(userId, guestSessionId, 30)
      ])

      // Calculate total days with streak in last 30 days
      const daysWithStreak = history.filter(day => day.streak_count > 0).length
      const averageStreak = history.length > 0 
        ? Math.round(history.reduce((sum, day) => sum + day.streak_count, 0) / history.length)
        : 0

      return {
        currentStreak,
        longestStreak,
        daysWithStreak,
        averageStreak,
        totalDays: history.length,
        recentHistory: history.slice(7) // Last 7 days
      }
    } catch (error) {
      console.error('Failed to get streak stats:', error)
      return {
        currentStreak: 0,
        longestStreak: 0,
        daysWithStreak: 0,
        averageStreak: 0,
        totalDays: 0,
        recentHistory: []
      }
    }
  }
}

// Create singleton instance
export const streakService = new StreakService()
export default streakService
