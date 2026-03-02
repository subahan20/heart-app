import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Button } from '../../components/common/Button'
import { Moon, Sun, Clock, Bell } from 'lucide-react'
import { useDailyTracking } from '../../hooks/useDailyTracking'
import { supabaseNotificationService } from '../../services/supabaseNotifications'
import { supabase } from '../../services/supabase'
import { aiService } from '../../services/aiService'

import { persistenceService } from '../../services/persistenceService'

export default function SleepTrackerModal({ onClose, selectedDate, dateRange, rangeData }) {
  const { useDailyData, saveSleepData } = useDailyTracking()
  const dailyDataQuery = useDailyData(selectedDate)
  const today = new Date().toISOString().split('T')[0]
  const isPastDate = selectedDate < today
  const [sleepTime, setSleepTime] = useState('22:00')
  const [wakeTime, setWakeTime] = useState('06:00')
  const [sleepDuration, setSleepDuration] = useState(8)
  
  // Timer states
  const [isSleeping, setIsSleeping] = useState(false)
  const [isWaking, setIsWaking] = useState(false)
  const [sleepRemaining, setSleepRemaining] = useState(0)
  const [isSleepCompleted, setIsSleepCompleted] = useState(false)
  const [actualSleepHours, setActualSleepHours] = useState(0)
  const [isWaitingToSleep, setIsWaitingToSleep] = useState(false)
  const [preSleepNotified, setPreSleepNotified] = useState(false)
  const [userId, setUserId] = useState(null)
  const [guestSessionId, setGuestSessionId] = useState(null)

  // Recovery logic for persistence
  useEffect(() => {
    const fetchUserAndRecover = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      let currentUserId = null
      let currentGuestId = null
      if (user) {
        setUserId(user.id)
        currentUserId = user.id
      } else {
        const gid = aiService.getChatSessionId()
        setGuestSessionId(gid)
        currentGuestId = gid
      }

      if (isPastDate) return

      // Recover state from Supabase instead of localStorage
      const saved = await persistenceService.getState('sleep_schedule', currentUserId, currentGuestId)
      
      if (saved) {
        const { scheduledTime, activeStartTime, duration } = saved
        const now = new Date().getTime()

        if (activeStartTime) {
          // If already sleeping, calculate remaining
          const elapsedSeconds = Math.floor((now - activeStartTime) / 1000)
          const totalSeconds = Math.round(duration * 3600)
          const remaining = totalSeconds - elapsedSeconds

          if (remaining > 0) {
            setSleepRemaining(remaining)
            setIsSleeping(true)
          } else {
            // Already finished while app was closed
            setSleepRemaining(0)
            setIsSleeping(false)
            setIsSleepCompleted(true)
            await persistenceService.removeState('sleep_schedule', currentUserId, currentGuestId)
          }
        } else if (scheduledTime) {
          // Check if scheduled time has passed
          if (now >= scheduledTime) {
            const startNow = new Date().getTime()
            const totalSeconds = Math.round(duration * 3600)
            setSleepRemaining(totalSeconds)
            setIsSleeping(true)
            
            // Update storage/database to "Sleeping"
            await persistenceService.saveState('sleep_schedule', { 
              scheduledTime: null, 
              activeStartTime: startNow, 
              duration 
            }, currentUserId, currentGuestId)
          } else {
            setIsWaitingToSleep(true)
          }
        }
      }
    }
    fetchUserAndRecover()
  }, [isPastDate])

  const isRangeMode = dateRange && dateRange[0] && dateRange[1]

  // Load previously saved sleep data
  useEffect(() => {
    if (!isRangeMode && dailyDataQuery.data?.sleep) {
      setSleepTime(dailyDataQuery.data.sleep.sleep_time || '22:00')
      setWakeTime(dailyDataQuery.data.sleep.wake_time || '06:00')
      // Quality is calculated based on duration, so we don't need to load it separately
      // It will be recalculated when duration changes
    }
  }, [dailyDataQuery.data, isRangeMode])

  useEffect(() => {
    calculateSleepDuration()
  }, [sleepTime, wakeTime])

  // Sleep timer effect
  useEffect(() => {
    if (isSleeping && sleepRemaining > 0) {
      const timer = setInterval(() => {
        setSleepRemaining(prev => {
          if (prev <= 1) {
            setIsSleeping(false)
            setIsSleepCompleted(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isSleeping, sleepRemaining])

  // Deferred start and notification effect
  useEffect(() => {
    if (!isWaitingToSleep || isSleeping || isPastDate) return

    const checkTime = () => {
      const now = new Date()
      const [sleepHour, sleepMin] = sleepTime.split(':').map(Number)
      const target = new Date()
      target.setHours(sleepHour, sleepMin, 0, 0)

      // If target time is earlier than now, it might be for tomorrow or just passed
      // But for "Sleep Tracker", we usually mean today's/tonight's sleep.
      // If it's already past the target time (like 22:00 and it's 22:05), start immediately.
      if (now >= target && (now.getTime() - target.getTime()) < 12 * 60 * 60 * 1000) {
        setIsWaitingToSleep(false)
        
        // Start immediately and update storage
        const startNow = new Date().getTime()
        const totalSeconds = Math.round(sleepDuration * 3600)
        setSleepRemaining(totalSeconds)
        setIsSleeping(true)

        persistenceService.saveState('sleep_schedule', { 
          scheduledTime: null, 
          activeStartTime: startNow, 
          duration: sleepDuration 
        }, userId, guestSessionId)
        return
      }

      // Check for 30-minute notification
      const diffMs = target.getTime() - now.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))

      if (diffMins > 0 && diffMins <= 30 && !preSleepNotified) {
        setPreSleepNotified(true)
        supabaseNotificationService.createNotification(
          userId,
          guestSessionId,
          'sleep',
          'reminder',
          '🌙 Sleep Preparation',
          'Prepare for rest! Put away your mobile phone 30 minutes before sleep for better quality rest. 📱❌'
        ).catch(err => {})
      }
    }

    const interval = setInterval(checkTime, 30000) // Check every 30 seconds
    checkTime() // Initial check

    return () => clearInterval(interval)
  }, [isWaitingToSleep, sleepTime, isSleeping, userId, guestSessionId, preSleepNotified, isPastDate])

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const calculateSleepDuration = () => {
    if (!sleepTime || !wakeTime) return

    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number)
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number)

    let sleepMinutes = sleepHour * 60 + sleepMin
    let wakeMinutes = wakeHour * 60 + wakeMin

    if (wakeMinutes < sleepMinutes) {
      wakeMinutes += 24 * 60
    }

    const durationMinutes = wakeMinutes - sleepMinutes
    const durationHours = durationMinutes / 60

    setSleepDuration(durationHours)
  }

  const handleSleepTimeChange = (time) => {
    setSleepTime(time)
    const [hour, min] = time.split(':').map(Number)
    let wakeHour = hour + 6
    let wakeMin = min
    if (wakeHour >= 24) wakeHour = wakeHour - 24
    const newWakeTime = `${wakeHour.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}`
    setWakeTime(newWakeTime)
  }

  const handleWakeTimeChange = (time) => {
    setWakeTime(time)
  }

  const handleStartSleep = (forceImmediate = false) => {
    if (isPastDate) {
      toast.error('Cannot log for past dates')
      return
    }
    if (!sleepDuration || sleepDuration <= 0) {
      toast.warning('Set valid duration')
      return
    }

    const now = new Date()
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number)
    const target = new Date()
    target.setHours(sleepHour, sleepMin, 0, 0)
    
    // If target is in the past, it might be for tomorrow but we usually assume today
    if (target < now && (now.getTime() - target.getTime()) > 12 * 60 * 60 * 1000) {
      target.setDate(target.getDate() + 1)
    }

    const storageKey = userId ? `sleep_schedule_${userId}` : `sleep_schedule_${guestSessionId}`

    if (!forceImmediate && target.getTime() - now.getTime() > 60000) {
      // Deferred start
      setIsWaitingToSleep(true)
      
      const diffMs = target.getTime() - now.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMinsTotal = Math.floor(diffMs / (1000 * 60))
      const diffMinsFinal = diffMinsTotal % 60
      
      const timeStr = diffHours > 0 
        ? `${diffHours}h ${diffMinsFinal}m` 
        : `${diffMinsFinal}m`

      // Send immediate notification about schedule
      supabaseNotificationService.createNotification(
        userId,
        guestSessionId,
        'sleep',
        'reminder',
        '📅 Sleep Scheduled',
        `Sleep timer scheduled! Your sleep starts in ${timeStr}. Get ready for rest! 😴`
      ).catch(err => console.error('Notification error:', err))

      // Persist schedule
      persistenceService.saveState('sleep_schedule', { 
        scheduledTime: target.getTime(), 
        activeStartTime: null, 
        duration: sleepDuration 
      }, userId, guestSessionId)
      return
    }

    // Immediate start
    const startNow = now.getTime()
    const totalSeconds = Math.round(sleepDuration * 3600)
    setSleepRemaining(totalSeconds)
    setIsSleeping(true)
    setIsWaitingToSleep(false)

    // Persist active sleep
    persistenceService.saveState('sleep_schedule', { 
      scheduledTime: null, 
      activeStartTime: startNow, 
      duration: sleepDuration 
    }, userId, guestSessionId)
  }

  const handleStopSleep = async () => {
    setIsSleeping(false)
    setIsSleepCompleted(true)
    await persistenceService.removeState('sleep_schedule', userId, guestSessionId)
  }

  const handleCompleteSleep = async () => {
    // Calculate actual sleep time from timer
    const totalSeconds = Math.round(sleepDuration * 3600)
    const actualSleepSeconds = totalSeconds - sleepRemaining
    const actualHours = Math.max(0.1, Math.round((actualSleepSeconds / 3600) * 10) / 10) // Minimum 0.1 hours
    
    setActualSleepHours(actualHours)
    
    await persistenceService.removeState('sleep_schedule', userId, guestSessionId)
    
    // Don't save for past dates
    if (isPastDate) {
      return
    }
    
    const sleepQuality = getSleepQuality(actualHours)
    
    try {
      await saveSleepData({
        date: selectedDate,
        sleepTime,
        wakeTime,
        duration: actualHours, // Use actual time, not planned time
        quality: sleepQuality.level
      })
      setIsSleepCompleted(false)
      onClose()
    } catch (error) {
      toast.error('Failed to save sleep')
    }
  }

  const handleMarkAsComplete = async () => {
    if (isPastDate) {
      toast.error('Cannot log for past dates')
      return
    }
    if (!sleepDuration || sleepDuration <= 0) {
      toast.warning('Set valid duration')
      return
    }

    try {
      const quality = getSleepQuality(sleepDuration)
      await saveSleepData({
        date: selectedDate,
        sleepTime,
        wakeTime,
        duration: sleepDuration,
        quality: quality.level
      })
      toast.success('Sleep logged successfully!')
      onClose()
    } catch (error) {
      toast.error('Failed to save sleep')
    }
  }

  const getSleepQuality = (duration = sleepDuration) => {
    if (duration >= 7 && duration <= 9) return { level: 'Good', color: 'text-green-600', bg: 'bg-green-50' }
    if (duration >= 6 && duration < 7) return { level: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    if (duration < 6) return { level: 'Poor', color: 'text-red-600', bg: 'bg-red-50' }
    return { level: 'Too Much', color: 'text-blue-600', bg: 'bg-blue-50' }
  }

  const sleepQuality = getSleepQuality()

  if (isWaitingToSleep) {
    return (
      <div className="text-center py-8 text-gray-900">
        <div className="text-6xl mb-4">🌙</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Preparing for Sleep</h3>
        <p className="text-gray-600 mb-8">
          The timer will start automatically at <span className="font-bold text-purple-600">{sleepTime}</span>.
        </p>
        
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 mb-8">
          <div className="flex items-center gap-4 text-left">
            <Bell className="w-8 h-8 text-purple-600 shrink-0" />
            <div>
              <p className="font-semibold text-purple-900">Get Ready!</p>
              <p className="text-sm text-purple-700">Avoid using your mobile phone 30 minutes before sleep.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => handleStartSleep(true)}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            🚀 Start Now Regardless
          </Button>
          <Button 
            onClick={() => setIsWaitingToSleep(false)}
            variant="outline"
            className="w-full"
          >
            ❌ Cancel Schedule
          </Button>
        </div>
      </div>
    )
  }

  if (isSleeping) {
    const progress = ((Math.round(sleepDuration * 3600) - sleepRemaining) / (Math.round(sleepDuration * 3600))) * 100

    return (
      <div className="text-center py-8 text-gray-900">
        <div className="text-6xl mb-4">😴</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Sleep Timer Active</h3>
        
        <div className="my-8">
          <div className="text-7xl font-bold text-blue-600 mb-4">
            {formatTime(sleepRemaining)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            {Math.round(progress)}% completed
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleStopSleep}
            variant="outline"
            className="w-full"
          >
            ⏸️ Pause Sleep
          </Button>
          <Button 
            onClick={handleCompleteSleep}
            disabled={isPastDate}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isPastDate ? 'Past Date - Cannot Save' : '✅ Wake Up'}
          </Button>
        </div>
      </div>
    )
  }

  if (isSleepCompleted) {
    const totalSeconds = Math.round(sleepDuration * 3600)
    const actualSleepSeconds = totalSeconds - sleepRemaining
    const actualHours = Math.max(0.1, Math.round((actualSleepSeconds / 3600) * 10) / 10)
    const completedQuality = getSleepQuality(actualHours)

    return (
      <div className="text-center py-8 text-gray-900">
        <div className="text-5xl mb-3">😴</div>
        <h2 className="text-2xl font-bold text-blue-600 mb-2">🌙 Sleep Complete!</h2>
        <p className="text-gray-600">
          You slept for {actualHours} hours
        </p>
        <div className={`mt-4 px-4 py-2 rounded-lg ${completedQuality.bg} ${completedQuality.color}`}>
          <span className="font-semibold">Sleep Quality: {completedQuality.level}</span>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => {
              setIsSleepCompleted(false)
              setActualSleepHours(0)
            }}
            variant="outline"
            className="flex-1"
          >
            🔄 Sleep Again
          </Button>
          <Button
            onClick={handleCompleteSleep}
            className="flex-1"
          >
            💾 Save Sleep
          </Button>
        </div>
      </div>
    )
  }

  if (isRangeMode) {
    const rangeList = Array.isArray(rangeData) ? rangeData : []

    return (
      <div className="no-scrollbar space-y-4 max-h-[60vh] overflow-y-auto pr-2">
         {rangeList.length === 0 ? (
             <p className="text-gray-500 text-center py-8">No sleep data recorded for this period.</p>
         ) : (
             rangeList.map((day, idx) => {
                 const duration = day.duration_hours || 0
                 // Helper to get quality badge for past data
                 const getQualityBadge = (d) => {
                     if (d >= 7 && d <= 9) return { level: 'Good', color: 'text-green-700', bg: 'bg-green-100' }
                     if (d >= 6 && d < 7) return { level: 'Fair', color: 'text-yellow-700', bg: 'bg-yellow-100' }
                     if (d < 6) return { level: 'Poor', color: 'text-red-700', bg: 'bg-red-100' }
                     return { level: 'Too Much', color: 'text-blue-700', bg: 'bg-blue-100' }
                 }
                 const quality = getQualityBadge(duration)

                 return (
                     <div key={idx} className="border border-purple-200 rounded-lg p-4 bg-white">
                         <div className="flex justify-between items-center mb-2 border-b border-purple-100 pb-2">
                             <h4 className="font-bold text-gray-800">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
                             <span className={`text-xs font-bold px-2 py-1 rounded-full ${quality.bg} ${quality.color}`}>{quality.level}</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Duration</p>
                                <p className="font-bold text-purple-700 text-lg">{duration}h</p>
                            </div>
                            <div className="text-right text-sm text-gray-600 space-y-1">
                                <p><Moon className="w-3 h-3 inline mr-1" /> {day.sleep_time}</p>
                                <p><Sun className="w-3 h-3 inline mr-1" /> {day.wake_time}</p>
                            </div>
                         </div>
                     </div>
                 )
             })
         )}
         <div className="sticky bottom-0 bg-white pt-4 border-t mt-4">
             <Button onClick={onClose} variant="outline" className="w-full">Close</Button>
         </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {isPastDate && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 text-blue-700">
          <span className="text-xl">📅</span>
          <div>
            <p className="text-sm font-bold mb-1">Viewing History</p>
            <p className="text-xs leading-relaxed opacity-90">
              This is a saved record of your health journey. To ensure your timeline remains accurate, logs can only be added or changed on the day they happen. Keep up the great work!
            </p>
          </div>
        </div>
      )}

      {/* Sleep Duration Display */}
      <div className="text-center">
        <div className="text-5xl font-bold text-gray-900 mb-2">
          {sleepDuration.toFixed(1)}h
        </div>
        <p className="text-sm text-gray-600">Sleep Duration</p>
      </div>

      {/* Time Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sleep Time */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <Moon className="w-4 h-4 inline mr-2" />
            Sleep Time
          </label>
          <input
            type="time"
            value={sleepTime}
            onChange={(e) => handleSleepTimeChange(e.target.value)}
            disabled={isPastDate}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="text-xs text-gray-500">When you go to bed</p>
        </div>

        {/* Wake Time */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <Sun className="w-4 h-4 inline mr-2" />
            Wake Time
          </label>
          <input
            type="time"
            value={wakeTime}
            onChange={(e) => handleWakeTimeChange(e.target.value)}
            disabled={isPastDate}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="text-xs text-gray-500">When you wake up</p>
        </div>
      </div>

      {/* Sleep Schedule Visualization */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-3">Sleep Schedule</h4>
        <div className="flex items-center justify-between">
          <div className="text-center">
            <Moon className="w-8 h-8 text-purple-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-gray-700">Bedtime</p>
            <p className="text-lg font-bold text-purple-600">{sleepTime}</p>
          </div>
          <div className="flex-1 mx-4">
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full"></div>
              <div 
                className="absolute top-0 left-0 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                style={{ width: `${Math.min((sleepDuration / 12) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-600">{sleepDuration.toFixed(1)} hours</span>
              <Sun className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="text-center">
            <Sun className="w-8 h-8 text-orange-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-gray-700">Wake up</p>
            <p className="text-lg font-bold text-orange-600">{wakeTime}</p>
          </div>
        </div>
      </div>


      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!isPastDate && (
          <Button
            onClick={handleMarkAsComplete}
            className="flex-1 bg-green-600 hover:bg-green-700 order-2 sm:order-1"
          >
            ✅ Log Manually
          </Button>
        )}
        <Button
          onClick={handleStartSleep}
          disabled={!sleepDuration || sleepDuration <= 0 || isPastDate}
          className="flex-1 bg-purple-600 hover:bg-purple-700 order-1 sm:order-2"
        >
          {isPastDate ? 'Read Only' : '🌙 Start Timer'}
        </Button>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full sm:w-1/2"
        >
          Cancel
        </Button>
      </div>

    </div>
  )
}
