import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

// Hooks
import { useDailyTracking } from '../hooks/useDailyTracking'
import { useHealthProfile } from '../hooks/useHealthProfile'
import { useHealthData } from '../hooks/useHealthData'
import { useStreak } from '../hooks/useStreak'
import { useToastNotifications } from '../hooks/useToastNotifications'
import { useModalManager } from '../hooks/useModalManager'
import { useNotifications } from '../hooks/useNotifications'
import { useCelebration } from '../hooks/useCelebration'
import { useDailyMetrics } from '../hooks/useDailyMetrics'
import { useWeeklyRewards } from '../hooks/useWeeklyRewards' 
import { useSectionCompletion } from '../hooks/useSectionCompletion'
import { aiService } from '../services/aiService'

// Services
import { supabase } from '../services/supabase'

// Icons
import { 
  Flame 
} from 'lucide-react'

// Home Components
import HomeHeader from './Home/components/HomeHeader'
import TabNavigation from './Home/components/TabNavigation'
import DietTab from './Home/components/DietTab'
import ExerciseTab from './Home/components/ExerciseTab'
import SleepTab from './Home/components/SleepTab'
import WaterTab from './Home/components/WaterTab'
import StressTab from './Home/components/StressTab'
import HomeModals from './Home/components/HomeModals'
import CelebrationOverlays from './Home/components/CelebrationOverlays'
import GiftCelebrationModal from '../features/rewards/GiftCelebrationModal' // New import

// Constants & Utils
import { tabs } from './Home/constants'
import { getCongratsMessage } from './Home/utils'
import { formatNumber } from '../utils/formatters'

// Home Components
import ToastNotifications from '../features/notifications/ToastNotifications'

/**
 * Home Page Component
 * Refactored into modular components for better maintainability.
 * Logic is handled through custom hooks.
 */
export default function Home() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dateRange, setDateRange] = useState([null, null])
  const todayStr = new Date().toISOString().split('T')[0]
  const isPastDate = selectedDate < todayStr
  const [activeTab, setActiveTab] = useState('diet')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [congratsType, setCongratsType] = useState('')

  // ── Data hooks (must come before accessLevel) ──
  const { streak } = useStreak()
  const { modals, openModal: baseOpenModal, closeModal } = useModalManager()
  const celebration = useCelebration(0)
  const [dailyMetrics, dispatchMetrics] = useDailyMetrics()
  const { activeProfile: profile, activeProfileId, loading: profileLoading } = useHealthProfile()
  const streakCount = streak?.count || 0
  const { user } = useHealthData()
  const { notifications: allNotifications, isLoading: loadingNotifs, markAsRead } = useNotifications(user?.id)
  const { toasts, removeToast } = useToastNotifications(dailyMetrics, selectedDate)
  const { useDailyData } = useDailyTracking()
  const { data: dailyData, isLoading: isDailyLoading } = useDailyData(selectedDate)
  const { completionState, completedCount } = useSectionCompletion()

  // Weekly Rewards Detection
  const { newReward, clearReward } = useWeeklyRewards(streakCount)

  // ── Access Control Logic (needs user & profile from hooks above) ──
  // GUEST: Not logged in
  // PENDING: Logged in, but no complete profile / onboarding
  // FULL: Logged in and onboarded
  const accessLevel = useMemo(() => {
    if (!user) return 'GUEST'
    if (!profile || !profile.onboarding_complete) return 'PENDING'
    return 'FULL'
  }, [user, profile])

  // Guarded openModal — redirects GUEST → /auth, PENDING → /onboarding
  const openModal = useCallback((modalName) => {
    if (accessLevel === 'GUEST') {
      navigate('/auth')
      return
    }
    if (accessLevel === 'PENDING') {
      navigate('/onboarding')
      return
    }
    baseOpenModal(modalName)
  }, [accessLevel, navigate, baseOpenModal])

  // Group notifications for easier access
  const healthStatus = useMemo(() => {
    if (!allNotifications) return { alerts: [], warnings: [], notifications: [] }
    return {
      alerts: allNotifications.filter(n => n.type === 'alert'),
      warnings: allNotifications.filter(n => n.type === 'warning'),
      notifications: allNotifications.filter(n => n.type === 'congratulations' || n.type === 'daily_success' || n.type === 'notification' || n.type === 'achievement')
    }
  }, [allNotifications])

  const isLoading = isDailyLoading || profileLoading || loadingNotifs

  // 1. Synchronize data from dailyData to metrics state
  useEffect(() => {
    if (dailyData) {
      const { diet, exercise, sleep, water, stress } = dailyData
      
      // exercise comes from daily_exercise table with { exercises: [], total_minutes, total_calories }
      const formattedExerciseData = exercise ? {
        date: selectedDate,
        exercises: (exercise.exercises || []).map(ex => ({
          id: ex.id || Date.now(),
          type: ex.type || ex.activity_type || 'Exercise',
          duration: ex.duration || Math.round((ex.duration_seconds || 0) / 60),
          duration_label: ex.duration_label,
          calories: ex.calories || 0,
          time: ex.time || '',
          distance: ex.distance,
          intensity: ex.intensity || 'moderate'
        })),
        total_minutes: exercise.total_minutes || 0,
        total_calories: exercise.total_calories || 0
      } : null

      dispatchMetrics({
        type: 'SET_DATA',
        payload: {
          dietData: diet,
          exerciseData: formattedExerciseData,
          sleepData: sleep,
          waterData: water,
          stressData: stress
        }
      })

      if (diet) {
        // Calculate meal totals
        const mealTotals = {
          breakfast: (diet.meals?.breakfast || []).reduce((acc, item) => acc + (Number(item.calories) || 0), 0),
          lunch: (diet.meals?.lunch || []).reduce((acc, item) => acc + (Number(item.calories) || 0), 0),
          dinner: (diet.meals?.dinner || []).reduce((acc, item) => acc + (Number(item.calories) || 0), 0),
          snacks: (diet.meals?.snacks || []).reduce((acc, item) => acc + (Number(item.calories) || 0), 0)
        }

        dispatchMetrics({ type: 'UPDATE_CALORIES', payload: diet.total_calories || 0 })
        dispatchMetrics({ type: 'UPDATE_MEALS', payload: mealTotals })
      } else {
        dispatchMetrics({ type: 'UPDATE_CALORIES', payload: 0 })
        dispatchMetrics({ type: 'UPDATE_MEALS', payload: { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 } })
      }

      if (exercise) {
        dispatchMetrics({ type: 'UPDATE_EXERCISE', payload: exercise.total_minutes || 0 })
      } else {
        dispatchMetrics({ type: 'UPDATE_EXERCISE', payload: 0 })
      }

      if (sleep) {
        dispatchMetrics({ type: 'UPDATE_SLEEP', payload: sleep.duration_hours || 0 })
      } else {
        dispatchMetrics({ type: 'UPDATE_SLEEP', payload: 0 })
      }

      if (water) {
        dispatchMetrics({ type: 'UPDATE_WATER', payload: water.glasses || 0 })
        const goalInLiters = (water.goal_ml || 3000) / 1000
        dispatchMetrics({ type: 'UPDATE_WATER_GOAL', payload: goalInLiters })
      } else {
        dispatchMetrics({ type: 'UPDATE_WATER', payload: 0 })
        dispatchMetrics({ type: 'UPDATE_WATER_GOAL', payload: 3 })
      }

      if (stress) {
        dispatchMetrics({ type: 'UPDATE_STRESS', payload: stress.stress_level || 3 })
      } else {
        dispatchMetrics({ type: 'UPDATE_STRESS', payload: 3 })
      }
    } else {
      // No data for this date, reset metrics
      dispatchMetrics({ type: 'RESET' })
    }
  }, [dailyData, selectedDate])

  // Stress update logic
  const updateStress = async (level) => {
    // 1. Optimistic Update for immediate feedback
    dispatchMetrics({ type: 'UPDATE_STRESS', payload: level })
    
    try {
      await saveStressData({
        stress_level: level,
        date: selectedDate
      })
    } catch (error) {
      toast.error('Failed to save stress data')
      // Revert if error (Optional: could fetch original data)
      dailyDataQuery.refetch()
    }
  }

  // Check for daily goals completion and show congratulations
  useEffect(() => {
    const checkDailyGoals = () => {
      const goalStats = {
        diet: !!dailyMetrics.dietData || dailyMetrics.calories > 0,
        exercise: !!dailyMetrics.exerciseData || dailyMetrics.exercise > 0,
        sleep: dailyMetrics.sleep >= 0.1,
        water: dailyMetrics.water > 0,
        stress: (dailyMetrics.stressLevel <= 3 && !!dailyMetrics.stressData)
      }

      const completedGoals = []
      
      if (goalStats.diet) {
        const hasNotified = healthStatus.notifications.some(n => 
          n.metadata?.goal === 'diet' && n.metadata?.achieved_at?.startsWith(selectedDate)
        )
        if (!hasNotified) completedGoals.push('diet')
      }

      if (goalStats.exercise) {
        const hasNotified = healthStatus.notifications.some(n => 
          n.metadata?.goal === 'exercise' && n.metadata?.achieved_at?.startsWith(selectedDate)
        )
        if (!hasNotified) completedGoals.push('exercise')
      }

      if (goalStats.sleep) {
        const hasNotified = healthStatus.notifications.some(n => 
          n.metadata?.goal === 'sleep' && n.metadata?.achieved_at?.startsWith(selectedDate)
        )
        if (!hasNotified) completedGoals.push('sleep')
      }

      if (goalStats.water) {
        const hasNotified = healthStatus.notifications.some(n => 
          n.metadata?.goal === 'water' && n.metadata?.achieved_at?.startsWith(selectedDate)
        )
        if (!hasNotified) completedGoals.push('water')
      }

      if (goalStats.stress) {
        const hasNotified = healthStatus.notifications.some(n => 
          n.metadata?.goal === 'stress' && n.metadata?.achieved_at?.startsWith(selectedDate)
        )
        if (!hasNotified) completedGoals.push('stress')
      }


      // Streak is based on the 4 core metrics (diet, exercise, sleep, water)
      // Stress is considered a bonus and not mandatory for the daily streak
      const allGoalsMet = goalStats.diet && goalStats.exercise && goalStats.sleep && goalStats.water

      if (allGoalsMet) {
        const todayStr = new Date().toISOString().split('T')[0]
        if (selectedDate === todayStr && streak?.lastCompletedDate !== todayStr) {
          // Trigger UI celebration only. Database update is now handled by triggers.
          celebration.triggerStreakCelebration()
        }
      }
    }

    if (!isLoading) {
      checkDailyGoals()
    }
  }, [dailyMetrics, selectedDate, healthStatus.notifications, profile?.last_streak_date, isLoading])

  const { streakCount: celebrationStreakCount, updateStreakCount } = celebration
  
  // Auto-refresh streak count from DB on mount
  useEffect(() => {
    if (streak) {
      updateStreakCount(streak.count)
    }
  }, [streak, updateStreakCount])

  const handleClaimReward = async () => {
    if (newReward) {
      await markAsRead(newReward.id)
      clearReward()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <HomeHeader 
        streak={streak}
        streakCount={streakCount}
        navigate={navigate}
        openModal={openModal}
        celebration={celebration}
        profile={profile}
        accessLevel={accessLevel}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TabNavigation 
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          openModal={openModal}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          dateRange={dateRange}
          setDateRange={setDateRange}
          accessLevel={accessLevel}
        />


        <div className="mt-8">
          {activeTab === 'diet' && (
            <DietTab 
              dailyMetrics={dailyMetrics}
              openModal={openModal}
              isPastDate={isPastDate}
              dateRange={dateRange}
              accessLevel={accessLevel}
            />
          )}

          {activeTab === 'exercise' && (
            <ExerciseTab 
              dailyMetrics={dailyMetrics}
              openModal={openModal}
              isPastDate={isPastDate}
              dateRange={dateRange}
              selectedDate={selectedDate}
              accessLevel={accessLevel}
            />
          )}

          {activeTab === 'sleep' && (
            <SleepTab 
              dailyMetrics={dailyMetrics}
              openModal={openModal}
              isPastDate={isPastDate}
              dateRange={dateRange}
              accessLevel={accessLevel}
            />
          )}

          {activeTab === 'water' && (
            <WaterTab 
              dailyMetrics={dailyMetrics}
              openModal={openModal}
              isPastDate={isPastDate}
              selectedDate={selectedDate}
              dateRange={dateRange}
              accessLevel={accessLevel}
            />
          )}

          {activeTab === 'stress' && (
            <StressTab 
              dailyMetrics={dailyMetrics}
              openModal={openModal}
              isPastDate={isPastDate}
              dateRange={dateRange}
              updateStress={updateStress}
              selectedDate={selectedDate}
              accessLevel={accessLevel}
            />
          )}

        </div>
      </main>

      <HomeModals 
        modals={modals}
        closeModal={closeModal}
        selectedDate={selectedDate}
        dateRange={dateRange}
        dailyMetrics={dailyMetrics}
        profile={profile}
      />

      <CelebrationOverlays 
        streakCount={streakCount}
        celebration={celebration}
        congratsType={congratsType}
        getCongratsMessage={(goal) => getCongratsMessage(goal, dailyMetrics)}
      />

      <ToastNotifications 
        toasts={toasts}
        onRemove={removeToast}
      />

      {/* Weekly Gift Celebration */}
      <GiftCelebrationModal 
        isOpen={!!newReward}
        onClose={handleClaimReward}
        reward={newReward}
      />
    </div>
  )
}
