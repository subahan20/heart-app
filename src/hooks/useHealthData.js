import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { aiService } from '../services/aiService'

export const useHealthData = () => {
  const queryClient = useQueryClient()
  // MINIMALIST SOURCE OF TRUTH: localStorage
  const profileId = localStorage.getItem('activeProfileId')

  // --- Queries ---

  const useBPReadings = (limit = 10) => {
    return useQuery({
      queryKey: ['bp_readings', limit, profileId],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null
        
        if (!user && !guestSessionId) return []
 
        let query = supabase.from('bp_readings').select('*')
        
        if (profileId) {
          query = query.eq('profile_id', profileId)
        } else if (user) {
          query = query.eq('user_id', user.id)
        } else {
          query = query.eq('guest_session_id', guestSessionId)
        }

        const { data, error } = await query
          .order('reading_date', { ascending: false })
          .limit(limit)

        if (error) throw error
        return data || []
      }
    })
  }

  const useSugarReadings = (limit = 10) => {
    return useQuery({
      queryKey: ['sugar_readings', limit, profileId],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null
        
        if (!user && !guestSessionId) return []
 
        let query = supabase.from('sugar_readings').select('*')
        
        if (profileId) {
          query = query.eq('profile_id', profileId)
        } else if (user) {
          query = query.eq('user_id', user.id)
        } else {
          query = query.eq('guest_session_id', guestSessionId)
        }

        const { data, error } = await query
          .order('reading_date', { ascending: false })
          .limit(limit)

        if (error) throw error
        return data || []
      }
    })
  }


  const useRecommendations = (limit = 10, date = null) => {
    return useQuery({
      queryKey: ['recommendations', limit, date, profileId],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null
        
        if (!user && !guestSessionId) return []
 
        let query = supabase.from('recommendations').select('*')
        
        if (profileId) {
          query = query.eq('profile_id', profileId)
        } else if (user) {
          query = query.eq('user_id', user.id)
        } else {
          query = query.eq('guest_session_id', guestSessionId)
        }
        
        if (date) {
          query = query.gte('generated_at', `${date}T00:00:00Z`)
                       .lte('generated_at', `${date}T23:59:59Z`)
        }

        const { data, error } = await query
          .order('generated_at', { ascending: false })
          .limit(limit)

        if (error) throw error
        return data || []
      }
    })
  }

  const useAIInsights = (date = null, startDate = null, endDate = null) => {
    return useQuery({
      queryKey: ['ai_insights', date, startDate, endDate, profileId],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null
        const userId = user?.id || guestSessionId

        let query = supabase.from('recommendations').select('*')

        if (profileId) {
          query = query.eq('profile_id', profileId)
        } else if (user) {
          query = query.eq('user_id', user.id)
        } else {
          query = query.eq('context_data->>guest_session_id', userId)
        }
        
        if (startDate && endDate) {
          query = query.gte('context_data->>date', startDate)
                       .lte('context_data->>date', endDate)
        } else if (date) {
          query = query.gte('generated_at', `${date}T00:00:00Z`)
                       .lte('generated_at', `${date}T23:59:59Z`)
        }

        const { data, error } = await query
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        
        if (data) {
          if (Array.isArray(data.recommendation_data)) {
            return { insights: data.recommendation_data, isRange: startDate && endDate }
          } else if (data.recommendation_data?.insights) {
            return { insights: data.recommendation_data.insights, isRange: startDate && endDate }
          } else if (data.context_data?.full_data?.insights) {
            return { insights: data.context_data.full_data.insights, isRange: startDate && endDate }
          }
        }

        return { insights: [], isRange: false }
      }
    })
  }

  const useHealthInformation = () => {
    return useQuery({
      queryKey: ['health_information', profileId],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null
        
        if (!user && !guestSessionId) return null

        let query = supabase.from('health_information').select('*')

        if (profileId) {
          query = query.eq('profile_id', profileId)
        } else if (user) {
          query = query.eq('user_id', user.id)
        } else if (guestSessionId) {
          query = query.eq('guest_session_id', guestSessionId)
        }

        const { data, error } = await query.maybeSingle()

        if (error && error.code !== 'PGRST116') throw error
        return data || null
      }
    })
  }

  const useHealthScreenings = (limit = 10) => {
    return useQuery({
      queryKey: ['health_screenings', limit, profileId],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null

        let query = supabase.from('health_screenings').select('*')

        if (profileId) {
          query = query.eq('profile_id', profileId)
        } else if (user) {
          query = query.eq('user_id', user.id)
        } else if (guestSessionId) {
          query = query.eq('guest_session_id', guestSessionId)
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) throw error
        return data || []
      }
    })
  }


  // --- Mutations ---

  const saveBPReading = useMutation({
    mutationFn: async (bpData) => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      const payload = {
        systolic: bpData.systolic,
        diastolic: bpData.diastolic,
        notes: bpData.notes,
        reading_date: new Date().toISOString(),
        profile_id: profileId || null
      }

      if (user) {
        payload.user_id = user.id
      } else {
        payload.guest_session_id = guestSessionId
      }

      const { data, error } = await supabase
        .from('bp_readings')
        .insert(payload)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bp_readings', 10, profileId] })
    }
  })

  const saveSugarReading = useMutation({
    mutationFn: async (sugarData) => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      const payload = {
        glucose: sugarData.glucose,
        type: sugarData.type,
        notes: sugarData.notes,
        reading_date: new Date().toISOString(),
        profile_id: profileId || null
      }

      if (user) {
        payload.user_id = user.id
      } else {
        payload.guest_session_id = guestSessionId
      }

      const { data, error } = await supabase
        .from('sugar_readings')
        .insert(payload)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sugar_readings', 10, profileId] })
    }
  })


  const saveRecommendations = useMutation({
    mutationFn: async ({ recommendations, context }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      const payload = {
        recommendation_data: recommendations,
        context_data: context,
        generated_at: new Date().toISOString(),
        profile_id: profileId || null
      }

      if (user) {
        payload.user_id = user.id
      } else {
        payload.guest_session_id = guestSessionId
      }

      const { data, error } = await supabase
        .from('recommendations')
        .insert(payload)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recommendations', 10, variables.context?.date, profileId] })
    }
  })

  const saveAIInsight = useMutation({
    mutationFn: async ({ insights, date, startDate, endDate }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      const contextData = { 
        type: 'daily_insights', 
        date: date, 
        is_guest: !user?.id,
        ...(startDate && endDate && { startDate, endDate, isRange: true })
      }

      const payload = {
        user_id: user?.id || null,
        guest_session_id: !user?.id ? guestSessionId : null,
        recommendation_data: insights,
        context_data: user?.id ? contextData : { ...contextData, guest_session_id: guestSessionId },
        generated_at: new Date().toISOString(),
        profile_id: profileId || null
      }

      const { data, error } = await supabase
        .from('recommendations')
        .insert(payload)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai_insights', variables.date, variables.startDate, variables.endDate, profileId] })
    }
  })



  return useMemo(() => ({
    // Queries
    useBPReadings,
    useSugarReadings,
    useRecommendations,
    useAIInsights,
    useHealthScreenings,
    useHealthInformation,

    // Mutations
    saveBPReading: saveBPReading.mutateAsync,
    saveSugarReading: saveSugarReading.mutateAsync,
    saveRecommendations: saveRecommendations.mutateAsync,
    saveAIInsight: saveAIInsight.mutateAsync,

    // Auth/Context
    user: queryClient.getQueryData(['user']),

    // Statuses
    isSavingBP: saveBPReading.isPending,
    isSavingSugar: saveSugarReading.isPending,
    isSavingRecs: saveRecommendations.isPending,
    isSavingAIInsight: saveAIInsight.isPending
  }), [queryClient, saveBPReading.isPending, saveBPReading.mutateAsync, saveSugarReading.isPending, saveSugarReading.mutateAsync, saveRecommendations.isPending, saveRecommendations.mutateAsync, saveAIInsight.isPending, saveAIInsight.mutateAsync])
}
