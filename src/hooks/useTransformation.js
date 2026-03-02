import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'
import { useHealthProfile } from './useHealthProfile'

export const useTransformation = () => {
  const queryClient = useQueryClient()
  const { profile } = useHealthProfile()

  // Fetch current transformation plan
  const currentPlanQuery = useQuery({
    queryKey: ['transformation_plan', profile?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null

      let query = supabase
        .from('transformation_plans')
        .select('*')
        .eq('status', 'active')
        .order('week_number', { ascending: false })
        .limit(1)

      if (user) {
        query = query.eq('user_id', user.id)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query.maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!profile?.id || !!aiService.getChatSessionId()
  })

  // Submit Weekly Check-in
  const submitCheckinMutation = useMutation({
    mutationFn: async (checkinData) => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null

      // 1. Update patient_details with latest biometrics
      const profileUpdate = {
        weight: parseFloat(checkinData.weight),
        height: parseFloat(checkinData.height),
        blood_sugar: checkinData.bloodSugar,
        thyroid_status: checkinData.thyroidStatus,
        systolic: parseInt(checkinData.systolic),
        diastolic: parseInt(checkinData.diastolic),
        pulse: parseInt(checkinData.pulse),
        age: profile?.age || 30,
        gender: profile?.gender || 'other',
        full_name: profile?.full_name || 'User',
        activity_level: profile?.activity_level || 'moderate',
        last_weekly_checkin: new Date().toISOString()
      }

      if (user) {
        profileUpdate.user_id = user.id
      } else {
        profileUpdate.guest_session_id = guestSessionId
      }

      const { error: profileError } = await supabase
        .from('patient_details')
        .upsert(profileUpdate, { onConflict: user ? 'user_id' : 'guest_session_id' })
      if (profileError) throw profileError

      // 2. Determine current week number
      const currentWeek = currentPlanQuery.data?.week_number || 0
      const nextWeek = Math.min(currentWeek + 1, 12)

      // 3. Generate new plan via AI
      const planData = await aiService.generateWeeklyTransformationPlan(
        profile,
        {
          weightChange: parseFloat(checkinData.weight) - (profile?.weight || parseFloat(checkinData.weight)),
          bloodSugar: checkinData.bloodSugar,
          thyroidStatus: checkinData.thyroidStatus,
          latestBP: `${checkinData.systolic}/${checkinData.diastolic}`,
          pulse: checkinData.pulse,
          observations: checkinData.notes
        },
        nextWeek
      )

      // 4. Save the new plan
      const planPayload = {
        user_id: user?.id || null,
        guest_session_id: guestSessionId,
        week_number: nextWeek,
        diet_plan: planData.diet,
        exercise_plan: planData.exercise,
        suggestions: planData.health_suggestions,
        status: 'active'
      }

      // Mark old plans as completed
      let deactivateQuery = supabase.from('transformation_plans').update({ status: 'completed' })
      if (user) {
        deactivateQuery = deactivateQuery.eq('user_id', user.id)
      } else {
        deactivateQuery = deactivateQuery.eq('guest_session_id', guestSessionId)
      }
      await deactivateQuery.eq('status', 'active')

      const { data: newPlan, error: planError } = await supabase
        .from('transformation_plans')
        .upsert(planPayload, { onConflict: user ? 'user_id,week_number' : 'guest_session_id,week_number' })
        .select()
        .maybeSingle()

      if (planError) throw planError
      return newPlan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transformation_plan'] })
      queryClient.invalidateQueries({ queryKey: ['user_profile'] })
    }
  })

  // Create Initial Plan (Week 1)
  const generateFirstPlanMutation = useMutation({
    mutationFn: async (profileData) => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null

      // 1. Update transformation_start_date and basic info in patient_details
      const profileUpdate = {
        transformation_start_date: new Date().toISOString(),
        transformation_goal: profileData.activityLevel === 'sedentary' ? 'weight loss' : 'maintenance',
        full_name: profileData.name,
        age: parseInt(profileData.age),
        gender: profileData.gender,
        height: parseFloat(profileData.height),
        weight: parseFloat(profileData.weight),
        activity_level: profileData.activityLevel,
        diseases: profileData.diseases || [],
        systolic: profileData.systolic ? parseInt(profileData.systolic) : null,
        diastolic: profileData.diastolic ? parseInt(profileData.diastolic) : null,
        pulse: profileData.pulse ? parseInt(profileData.pulse) : null,
        blood_sugar: profileData.bloodSugar || null
      }

      if (user) {
        profileUpdate.user_id = user.id
      } else {
        profileUpdate.guest_session_id = guestSessionId
      }

      const { error: profileError } = await supabase
        .from('patient_details')
        .upsert(profileUpdate, { onConflict: user ? 'user_id' : 'guest_session_id' })
      if (profileError) throw profileError

      // 2. Generate Week 1 plan via AI
      const planData = await aiService.generateWeeklyTransformationPlan(
        { ...profile, ...profileData },
        null, // No previous progress for Week 1
        1
      )

      // 3. Save the new plan
      const planPayload = {
        user_id: user?.id || null,
        guest_session_id: guestSessionId,
        week_number: 1,
        diet_plan: planData.diet,
        exercise_plan: planData.exercise,
        suggestions: planData.health_suggestions,
        status: 'active'
      }

      const { data: newPlan, error: planError } = await supabase
        .from('transformation_plans')
        .upsert(planPayload, { onConflict: user ? 'user_id,week_number' : 'guest_session_id,week_number' })
        .select()
        .maybeSingle()

      if (planError) throw planError
      return newPlan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transformation_plan'] })
      queryClient.invalidateQueries({ queryKey: ['user_profile'] })
    }
  })

  return {
    currentPlan: currentPlanQuery.data,
    isLoadingPlan: currentPlanQuery.isLoading,
    submitCheckin: submitCheckinMutation.mutateAsync,
    generateFirstPlan: generateFirstPlanMutation.mutateAsync,
    isSubmitting: submitCheckinMutation.isPending || generateFirstPlanMutation.isPending
  }
}
