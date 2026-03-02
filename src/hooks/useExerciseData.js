import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { aiService } from '../services/aiService'

export const useExerciseData = (selectedDate) => {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch exercise data from activity_sessions table
  const fetchExerciseData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      console.log('Fetching exercise data for:', { user: !!user, guestSessionId, selectedDate })
      
      let query = supabase
        .from('activity_sessions')
        .select('*')
        .eq('activity_type', 'exercise')
        .eq('completed', true)
      
      if (user) {
        query = query.eq('user_id', user.id)
        console.log('Querying for user_id:', user.id)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
        console.log('Querying for guest_session_id:', guestSessionId)
      }
      
      // Fix date filtering - use proper date boundaries
      const today = selectedDate || new Date().toISOString().split('T')[0]
      const startOfDay = new Date(today + 'T00:00:00.000Z').toISOString()
      const endOfDay = new Date(today + 'T23:59:59.999Z').toISOString()
      
      console.log('Date range:', { startOfDay, endOfDay })
      
      const { data, error } = await query
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .order('start_time', { ascending: false })
      
      if (error) {
        console.error('Supabase query error:', error)
        throw error
      }
      
      console.log('Raw fetched exercise data:', data) // Debug log
      
      // Debug: Also try a simple query without date filtering
      const { data: allData } = await supabase
        .from('activity_sessions')
        .select('*')
        .eq('activity_type', 'exercise')
        .eq('completed', true)
        .limit(5)
      
      console.log('All exercise data (no date filter):', allData)
      
      if (data && data.length > 0) {
        // Convert activity_sessions data to exercise format for display
        const convertedExercises = data.map(session => ({
          id: session.id,
          type: session.exercise_name || session.activity_type,
          duration: Math.round((session.actual_duration_seconds || session.duration_seconds) / 60),
          calories: session.calories_burned || Math.round((session.actual_duration_seconds || session.duration_seconds) / 60 * 8),
          intensity: session.intensity || 'moderate',
          time: new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          completed_at: session.completed_at,
          start_time: session.start_time,
          actual_duration_seconds: session.actual_duration_seconds,
          planned_duration_seconds: session.duration_seconds
        }))
        console.log('Converted exercises for display:', convertedExercises) // Debug log
        setExercises(convertedExercises)
      } else {
        console.log('No exercise data found')
        setExercises([])
      }
    } catch (error) {
      console.error('Error fetching exercise data:', error)
      setError(error.message)
      setExercises([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  // Fetch exercise data when component mounts or date changes
  useEffect(() => {
    if (selectedDate) {
      fetchExerciseData()
    }
  }, [selectedDate, fetchExerciseData])

  // Add realtime subscription for immediate UI updates
  useEffect(() => {
    const subscription = supabase
      .channel('activity_sessions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'activity_sessions' },
        (payload) => {
          console.log('Activity session change:', payload)
          // Only refetch if it's an exercise session
          if (payload.new?.activity_type === 'exercise' || payload.old?.activity_type === 'exercise') {
            fetchExerciseData()
          }
        }
      )
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [fetchExerciseData])

  return {
    exercises,
    loading,
    error,
    refetch: fetchExerciseData
  }
}
