import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'

export const useHealthProfile = () => {
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['user_profile', aiService.getChatSessionId()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      if (!user && !guestSessionId) return null

      let query = supabase
        .from('patient_details')
        .select('*')

      if (user) {
        query = query.eq('user_id', user.id)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query.maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    }
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData) => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      if (!user && !guestSessionId) {
        throw new Error('No user session found')
      }

      // Calculate BMI
      const height = parseFloat(profileData.height)
      const weight = parseFloat(profileData.weight)
      let bmi = null
      let bmiStatus = null
      if (height && weight) {
        const heightInMeters = height / 100
        bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1))
        
        // Determine BMI status
        if (bmi < 18.5) bmiStatus = 'Underweight'
        else if (bmi < 25) bmiStatus = 'Normal'
        else if (bmi < 30) bmiStatus = 'Overweight'
        else bmiStatus = 'Obese'
      }

      const payload = {
        full_name: profileData.name,
        age: parseInt(profileData.age),
        height: parseFloat(profileData.height),
        weight: parseFloat(profileData.weight),
        gender: profileData.gender,
        activity_level: profileData.activityLevel,
        diseases: profileData.diseases || [],
        systolic: profileData.systolic ? parseInt(profileData.systolic) : null,
        diastolic: profileData.diastolic ? parseInt(profileData.diastolic) : null,
        pulse: profileData.pulse ? parseInt(profileData.pulse) : null,
        blood_sugar: profileData.bloodSugar || null
      }

      if (user) {
        payload.user_id = user.id
      } else if (guestSessionId) {
        payload.guest_session_id = guestSessionId
      }

      const { data: profileResult, error: profileError } = await supabase
        .from('patient_details')
        .upsert(payload, { onConflict: user ? 'user_id' : 'guest_session_id' })
        .select()
        .maybeSingle()

      if (profileError) throw profileError

      // Store BMI in health_information table
      if (bmi && bmiStatus) {
        let healthInfoQuery = supabase.from('health_information').upsert({
          bmi: bmi,
          bmi_status: bmiStatus,
          bmi_calculated_at: new Date().toISOString()
        })

        if (user) {
          healthInfoQuery = healthInfoQuery.eq('user_id', user.id)
        } else if (guestSessionId) {
          healthInfoQuery = healthInfoQuery.eq('guest_session_id', guestSessionId)
        }

        const { error: healthInfoError } = await healthInfoQuery

        if (healthInfoError) throw healthInfoError
      }

      return profileResult
    },
    onSuccess: () => {
      const sessionId = aiService.getChatSessionId()
      queryClient.invalidateQueries({ queryKey: ['user_profile', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['health_information'] })
    }
  })

  return useMemo(() => ({
    profile: profileQuery.data,
    loading: profileQuery.isLoading,
    error: profileQuery.error?.message,
    fetchProfile: profileQuery.refetch,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending
  }), [profileQuery.data, profileQuery.isLoading, profileQuery.error?.message, profileQuery.refetch, updateProfileMutation.mutateAsync, updateProfileMutation.isPending])
}
