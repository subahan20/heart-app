import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { supabaseNotificationService } from '../services/supabaseNotifications'
import { aiService } from '../services/aiService'

export const useToastNotifications = (dailyMetrics, selectedDate) => {
  const [toasts, setToasts] = useState([])
  const processedCategories = useRef(new Set()) // Track what we've already notified today

  // Check if it's today (not past date)
  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  // Reset processed categories if the date changes
  useEffect(() => {
    processedCategories.current.clear()
  }, [selectedDate])

  // Check for activity completion and show toast notifications
  useEffect(() => {
    if (!isToday) return

    const checkActivityToasts = async () => {
      try {
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser()
        const guestSessionId = !user ? aiService.getChatSessionId() : null
        const userId = user?.id

        const newToasts = []

        // Utility to check and add (Success)
        const checkSuccess = (category, current, goal, title, message) => {
          const key = `${category}-success`
          if (current >= goal && !processedCategories.current.has(key)) {
            newToasts.push({
              id: `${category}-${Date.now()}`,
              type: 'success',
              title,
              message,
              category
            })
            processedCategories.current.add(key)
          }
        }

        // Check goals
        checkSuccess('water', dailyMetrics.water, (dailyMetrics.waterGoal || 12), '💧 Water Goal!', "Great job staying hydrated today!")
        checkSuccess('diet', dailyMetrics.calories, (dailyMetrics.caloriesGoal || 2000), '🍽️ Nutrition Goal!', "Your nutrition is on track today!")
        checkSuccess('exercise', dailyMetrics.exercise, (dailyMetrics.exerciseGoal || 30), '🏃 Exercise Goal!', "You've reached your daily activity target!")
        
        // Sleep notification
        if (dailyMetrics.sleep >= 0.1) {
          checkSuccess('sleep', dailyMetrics.sleep, 0.1, '😴 Sleep Goal!', `You got ${dailyMetrics.sleep}h of rest!`)
        }
        
        // Stress notification - managed if logged and level is 3 or less
        if (dailyMetrics.stressData && dailyMetrics.stressLevel <= 3) {
          const key = 'stress-success'
          if (!processedCategories.current.has(key)) {
            newToasts.push({
              id: `stress-${Date.now()}`,
              type: 'success',
              title: '🧘 Stress Managed!',
              message: "You're keeping your stress levels in a healthy range.",
              category: 'stress'
            })
            processedCategories.current.add(key)
          }
        }

        // Add new toasts to UI
        if (newToasts.length > 0) {
          setToasts(prev => [...prev, ...newToasts].slice(-5))

          // Persist to database
          for (const toast of newToasts) {
            await supabaseNotificationService.createNotification(
              userId,
              guestSessionId,
              toast.category,
              toast.type === 'success' ? 'congratulations' : 'reminder',
              toast.title,
              toast.message,
              { type: 'auto_toast', category: toast.category }
            )
          }
        }

      } catch (error) {
        console.error('Error checking activity toasts:', error)
      }
    }

    // Check immediately and then every 5 minutes
    checkActivityToasts()
    
    const interval = setInterval(checkActivityToasts, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [dailyMetrics, selectedDate, isToday])

  // Remove toast after 5 seconds
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // Auto-remove toasts after 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setToasts(prev => prev.filter(toast => Date.now() - toast.id < 5000))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return { toasts, removeToast }
}
