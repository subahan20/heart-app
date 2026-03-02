import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'

export function useDailyTracking() {
  const queryClient = useQueryClient()

  // --- Queries ---

  const getDailyDataQuery = (date) => {
    const targetDate = date || new Date().toISOString().split('T')[0]
    return useQuery({
      queryKey: ['daily_data', targetDate],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        
        const fetchQuery = (table) => {
          let query = supabase.from(table).select('*').eq('date', targetDate)
          if (user) {
            query = query.eq('user_id', user.id)
          } else {
            const guestSessionId = aiService.getChatSessionId()
            query = query.eq('guest_session_id', guestSessionId).is('user_id', null)
          }
          return query.order('created_at', { ascending: false }).limit(1).maybeSingle()
        }

        const [diet, sleep, water, stress, exercise] = await Promise.all([
          fetchQuery('diet_plan'),
          fetchQuery('daily_sleep'),
          fetchQuery('daily_water'),
          fetchQuery('daily_stress'),
          // Fetch completed exercise sessions for the day
          (async () => {
            const startOfDay = `${targetDate}T00:00:00.000Z`
            const endOfDay = `${targetDate}T23:59:59.999Z`
            
            let query = supabase
              .from('activity_sessions')
              .select('*')
              .eq('activity_type', 'exercise')
              .eq('completed', true)
              .gte('start_time', startOfDay)
              .lte('start_time', endOfDay)

            if (user) {
              query = query.eq('user_id', user.id)
            } else {
              const guestSessionId = aiService.getChatSessionId()
              query = query.eq('guest_session_id', guestSessionId).is('user_id', null)
            }
            return query.order('start_time', { ascending: false })
          })()
        ])

        const exerciseSessions = exercise?.data || []
        const totalMinutes = exerciseSessions.reduce((acc, s) => acc + (Math.round((s.actual_duration_seconds || s.duration_seconds) / 60)), 0)
        const totalCalories = exerciseSessions.reduce((acc, s) => acc + (s.calories_burned || Math.round((s.actual_duration_seconds || s.duration_seconds) / 60 * 8)), 0)

        return {
          diet: diet.data,
          exercise: {
            sessions: exerciseSessions,
            total_minutes: totalMinutes,
            total_calories: totalCalories
          },
          sleep: sleep.data,
          water: water.data,
          stress: stress.data
        }
      }
    })
  }

  const useHistoryData = (days = 7) => {
    return useQuery({
      queryKey: ['history_data', days],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const dates = Array.from({ length: days }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - i)
          return d.toISOString().split('T')[0]
        })

        const fetchHistory = (table) => {
          let query = supabase.from(table).select('*').in('date', dates)
          if (user) {
            query = query.eq('user_id', user.id)
          } else {
            const guestSessionId = aiService.getChatSessionId()
            query = query.eq('guest_session_id', guestSessionId).is('user_id', null)
          }
          return query.order('date', { ascending: false })
        }

        const [diet, sleep, water, stress] = await Promise.all([
          fetchHistory('diet_plan'),
          fetchHistory('daily_sleep'),
          fetchHistory('daily_water'),
          fetchHistory('daily_stress'),
          // Fetch completed exercise sessions for the range
          (async () => {
            let query = supabase
              .from('activity_sessions')
              .select('*')
              .eq('activity_type', 'exercise')
              .eq('completed', true)
              .in('start_time', dates.map(d => `${d}T00:00:00.000Z`)) // This is tricky, better use range

            // Correct range query:
            const oldestDate = dates[dates.length - 1]
            const newestDate = dates[0]
            
            let q = supabase
              .from('activity_sessions')
              .select('*')
              .eq('activity_type', 'exercise')
              .eq('completed', true)
              .gte('start_time', `${oldestDate}T00:00:00.000Z`)
              .lte('start_time', `${newestDate}T23:59:59.999Z`)

            if (user) {
              q = q.eq('user_id', user.id)
            } else {
              const guestSessionId = aiService.getChatSessionId()
              q = q.eq('guest_session_id', guestSessionId).is('user_id', null)
            }
            return q.order('start_time', { ascending: false })
          })()
        ])

        const exerciseSessions = exercise?.data || []
        
        // Group exercise sessions by date
        const exerciseByDate = exerciseSessions.reduce((acc, session) => {
          const date = session.start_time.split('T')[0]
          if (!acc[date]) acc[date] = []
          acc[date].push(session)
          return acc
        }, {})

        // Map it to an array of objects per date for consistency
        const historicalExercise = Object.entries(exerciseByDate).map(([date, sessions]) => ({
          date,
          sessions,
          total_minutes: sessions.reduce((acc, s) => acc + (Math.round((s.actual_duration_seconds || s.duration_seconds) / 60)), 0),
          total_calories: sessions.reduce((acc, s) => acc + (s.calories_burned || Math.round((s.actual_duration_seconds || s.duration_seconds) / 60 * 8)), 0)
        }))

        return {
          diet: diet.data || [],
          exercise: historicalExercise,
          sleep: sleep.data || [],
          water: water.data || [],
          stress: stress.data || []
        }
      }
    })
  }

  // --- Mutations ---

  const createMutation = (table) => {
    return useMutation({
      mutationFn: async (payload) => {
        // --- Input Validation & Sanitization ---
        if (!payload || !payload.date) {
          throw new Error('Date is required for tracking data.')
        }
        
        const targetDate = payload.date
        const todayStr = new Date().toISOString().split('T')[0]
        
        // Central guard: Prevent modification of past dates
        if (targetDate < todayStr) {
          throw new Error('Historical records cannot be modified.')
        }
        
        // Get user authentication info
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null
        
        const dbPayload = {
          user_id: user?.id || null,
          guest_session_id: guestSessionId,
          date: targetDate,
          created_at: new Date().toISOString()
        }

        // Map frontend fields to DB columns based on table
        if (table === 'diet_plan') {
          dbPayload.meals = payload.meals
          dbPayload.total_calories = payload.totalCalories
          dbPayload.food_image = payload.foodImage
          dbPayload.is_breakfast_done = payload.is_breakfast_done || false
          dbPayload.is_lunch_done = payload.is_lunch_done || false
          dbPayload.is_snacks_done = payload.is_snacks_done || false
          dbPayload.is_dinner_done = payload.is_dinner_done || false
        } else if (table === 'daily_exercise') {
          // Divert to activity_sessions since daily_exercise doesn't exist natively
          const activityPayload = {
            user_id: user?.id || null,
            guest_session_id: guestSessionId,
            activity_type: 'exercise',
            start_time: new Date(targetDate + 'T00:00:00').toISOString(),
            duration_seconds: (payload.total_minutes || 0) * 60,
            actual_duration_seconds: (payload.total_minutes || 0) * 60,
            completed: true,
            is_exercise_done: true,
            completed_at: new Date().toISOString()
          }
          
          const { error } = await supabase.from('activity_sessions').insert(activityPayload)
          if (error) console.error('Exercise manual insertion error:', error)
          return
        } else if (table === 'daily_sleep') {
          dbPayload.sleep_time = payload.sleepTime
          dbPayload.wake_time = payload.wakeTime
          dbPayload.duration_hours = payload.duration
          dbPayload.quality = payload.quality
          dbPayload.is_sleep_done = payload.is_sleep_done || false
        } else if (table === 'daily_water') {
          dbPayload.glasses = payload.glasses
          dbPayload.goal_ml = payload.goalMl
          dbPayload.is_water_done = payload.is_water_done || false
        } else if (table === 'daily_stress') {
          dbPayload.stress_level = Number(payload.stressLevel)
          dbPayload.notes = payload.notes || null
          dbPayload.is_mental_stress_done = payload.is_mental_stress_done || false
        }

        // Use unified upsert strategy matching the DB unique index: user_id, guest_session_id, date
        const upsertQuery = supabase
          .from(table)
          .upsert(dbPayload, { 
            onConflict: 'user_id,guest_session_id,date',
            ignoreDuplicates: false // We want to update existing records for the same day
          })
        
        const { data, error } = await upsertQuery
          // Remove .select() to avoid PGRST116 errors

        if (error) {
          console.error(`[useDailyTracking] Upsert Error in ${table}:`, error)
          // Fallback: try regular insert/update if upsert fails
          if (error.code === '42P10' || error.code === '23505') {
            console.log('Falling back to insert/update approach due to constraint error')
            let query = supabase
              .from(table)
              .select('*')
              .eq('date', dbPayload.date)
            
            // Add proper filter based on user type
            if (dbPayload.user_id) {
              query = query.eq('user_id', dbPayload.user_id)
            } else if (dbPayload.guest_session_id) {
              query = query.eq('guest_session_id', dbPayload.guest_session_id)
            }
            
            const { data: existingData } = await query.maybeSingle()
            
            if (existingData) {
              // Update existing record
              const { error: updateError } = await supabase
                .from(table)
                .update(dbPayload)
                .eq('id', existingData.id)
              
              if (updateError) throw updateError
              return { data: existingData, dbPayload }
            } else {
              // Insert new record
              const { data: insertData, error: insertError } = await supabase
                .from(table)
                .insert(dbPayload)
                .select()
                .maybeSingle()
              
              if (insertError) throw insertError
              return { data: insertData, dbPayload }
            }
          } else {
            throw error
          }
        }
        
        return { data, dbPayload } // Return both for use in onSuccess
      },
      onSuccess: async ({ data, dbPayload }) => { // Receive both data and dbPayload
        if (data && data.date) {
          queryClient.invalidateQueries({ queryKey: ['daily_data', data.date] })
          queryClient.invalidateQueries({ queryKey: ['history_data'] })
        } else {
          queryClient.invalidateQueries({ queryKey: ['daily_data'] })
          queryClient.invalidateQueries({ queryKey: ['history_data'] })
        }
        
        // --- Sync with user_daily_tracking for real-time dashboard updates ---
        try {
          const { data: { user } } = await supabase.auth.getUser()
          const guestSessionId = !user ? aiService.getChatSessionId() : null
          
          const trackingMap = {
            'diet_plan': 'diet_completed',
            'daily_exercise': null, // Skip - handled by activity_sessions
            'daily_sleep': 'sleep_completed',
            'daily_water': 'water_completed',
            'daily_stress': 'stress_completed'
          }

          if (trackingMap[table]) {
            const trackingPayload = {
              user_id: user?.id || null,
              guest_session_id: guestSessionId,
              date: data?.date || dbPayload.date, // Use fallback if data is null
              [trackingMap[table]]: true,
              updated_at: new Date().toISOString()
            }

            // Also handle specific meal flags if it's a diet plan
            if (table === 'diet_plan' && dbPayload.meals) {
              if (dbPayload.meals.breakfast?.length > 0) trackingPayload.breakfast_completed = true
              if (dbPayload.meals.lunch?.length > 0) trackingPayload.lunch_completed = true
              if (dbPayload.meals.dinner?.length > 0) trackingPayload.dinner_completed = true
              if (dbPayload.meals.snacks?.length > 0) trackingPayload.snacks_completed = true
            }

            await supabase
              .from('user_daily_tracking')
              .upsert(trackingPayload, { 
                onConflict: 'user_id,guest_session_id,date' 
              })
          }
        } catch (err) {
          console.error('Failed to sync user_daily_tracking:', err)
        }
        // --- End Sync ---

        // Dispatch legacy events for compatibility during transition
        const eventMap = {
          'diet_plan': 'dietDataUpdated',
          'daily_exercise': null, // Skip - handled by activity_sessions
          'daily_sleep': 'sleepDataUpdated',
          'daily_water': 'waterDataUpdated',
          'daily_stress': 'stressDataUpdated'
        }
        window.dispatchEvent(new CustomEvent(eventMap[table]))
      }
    })
  }

  const dietMutation = createMutation('diet_plan')
  // const exerciseMutation = createMutation('daily_exercise') // Removed - use activity_sessions instead
  const sleepMutation = createMutation('daily_sleep')
  const waterMutation = createMutation('daily_water')
  const stressMutation = createMutation('daily_stress')

  return useMemo(() => ({
    // Queries
    useDailyData: getDailyDataQuery,
    useHistoryData,
    
    // Mutation objects
    dietMutation,
    // exerciseMutation, // Removed - use activity_sessions instead
    sleepMutation,
    waterMutation,
    stressMutation,
    
    // Convenience mutation functions
    saveDietData: dietMutation.mutateAsync,
    // saveExerciseData: exerciseMutation.mutateAsync, // Removed - use activity_sessions instead
    saveSleepData: sleepMutation.mutateAsync,
    saveWaterData: waterMutation.mutateAsync,
    saveStressData: stressMutation.mutateAsync,
    
    // Loading states
    isLoading: dietMutation.isPending || sleepMutation.isPending || waterMutation.isPending || stressMutation.isPending
  }), [dietMutation, sleepMutation, waterMutation, stressMutation, getDailyDataQuery])
}
