import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { Button } from '../../components/common/Button'
import { Dumbbell, Clock, Flame, Play, Pause, RotateCcw, CheckCircle2, Sparkles } from 'lucide-react'
import { useDailyTracking } from '../../hooks/useDailyTracking'
import { useActivityTimer } from '../../hooks/useActivityTimer'
import { useTransformation } from '../../hooks/useTransformation'

const EXERCISE_TYPES = [
  { id: 'walking',    name: 'Walking',          caloriesPerMin: 4  },
  { id: 'running',    name: 'Running',          caloriesPerMin: 10 },
  { id: 'cycling',    name: 'Cycling',          caloriesPerMin: 8  },
  { id: 'swimming',   name: 'Swimming',         caloriesPerMin: 11 },
  { id: 'yoga',       name: 'Yoga',             caloriesPerMin: 3  },
  { id: 'stretching', name: 'Stretching',       caloriesPerMin: 2  },
  { id: 'workouts',   name: 'Workouts',         caloriesPerMin: 8  },
  { id: 'strength',   name: 'Strength Training',caloriesPerMin: 6  },
  { id: 'cardio',     name: 'Cardio',           caloriesPerMin: 9  },
  { id: 'sports',     name: 'Sports',           caloriesPerMin: 7  }
]

export default function ExerciseTrackerModal({ onClose, selectedDate, dateRange, rangeData }) {
  const { useDailyData, saveExerciseData } = useDailyTracking()
  const { currentPlan } = useTransformation()
  const dailyDataQuery = useDailyData(selectedDate)
  const today = new Date().toISOString().split('T')[0]
  const isPastDate = selectedDate < today

  const aiTargetKm = currentPlan?.exercise_plan?.target_km || 3.5
  const [selectedExercise, setSelectedExercise] = useState('walking')
  const [duration, setDuration] = useState(0)
  const [distance, setDistance] = useState(aiTargetKm)
  const [exercises, setExercises] = useState([])
  const [isExerciseActive, setIsExerciseActive] = useState(false)

  // Update distance if AI plan loads later
  useEffect(() => {
    if (currentPlan?.exercise_plan?.target_km) {
      setDistance(currentPlan.exercise_plan.target_km)
    }
  }, [currentPlan])

  // Secure timer hook for exercise sessions
  const {
    session: timerSession,
    timeRemaining,
    isRunning: isTimerRunning,
    isCompleted: isTimerCompleted,
    isLoading: isTimerLoading,
    error: timerError,
    canComplete,
    startSession: startTimerSession,
    completeSession: completeTimerSession,
    cancelSession: cancelTimerSession,
    resetTimer: resetTimerSession
  } = useActivityTimer({
    activityType: 'exercise',
    durationSeconds: duration * 60,
    onComplete: () => {
      // Auto-save exercise when timer completes
      completeExercise()
    },
    onError: (error) => {
      console.error('Timer error:', error)
    }
  })

  // Legacy timer state for backward compatibility
  const [elapsedTime, setElapsedTime] = useState(0)
  const startTimeRef = useRef(null)
  const pausedElapsedRef = useRef(0)
  const intervalRef = useRef(null)

  // Calculate elapsed time from secure timer
  useEffect(() => {
    if (timerSession && duration > 0) {
      const elapsed = duration * 60 - timeRemaining
      setElapsedTime(elapsed)
    }
  }, [timerSession, timeRemaining, duration])

  // Update exercise active state based on timer
  useEffect(() => {
    setIsExerciseActive(isTimerRunning)
  }, [isTimerRunning])

  const isRangeMode = dateRange && dateRange[0] && dateRange[1]

  // Load previously saved exercises
  useEffect(() => {
    if (!isRangeMode && dailyDataQuery.data?.exercise?.exercises) {
      setExercises(dailyDataQuery.data.exercise.exercises)
    }
  }, [dailyDataQuery.data, isRangeMode])

  // Whether the user-set target has been reached
  const targetSeconds = duration > 0 ? duration * 60 : 0
  const targetReached = targetSeconds === 0 || elapsedTime >= targetSeconds
  const progressPct = targetSeconds > 0 ? Math.min(100, Math.round((elapsedTime / targetSeconds) * 100)) : 100

  // Remove old auto-complete logic since secure timer handles it

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startExercise = async () => {
    if (!selectedExercise) return
    
    try {
      setIsExerciseActive(true)
      // Start secure timer session
      await startTimerSession()
    } catch (error) {
      console.error('Failed to start exercise:', error)
      setIsExerciseActive(false)
    }
  }

  const resetTimer = () => {
    resetTimerSession()
    setElapsedTime(0)
    setIsExerciseActive(false)
  }

  const completeExercise = async () => {
    if (elapsedTime === 0) return

    // For timed sessions, ensure backend validation passes
    if (duration > 0 && timerSession) {
      try {
        const success = await completeTimerSession()
        if (!success) {
          console.warn('Exercise completion rejected by backend')
          return
        }
      } catch (error) {
        console.error('Backend validation failed:', error)
        return
      }
    }

    const exercise = EXERCISE_TYPES.find(e => e.id === selectedExercise)

    // Use exact elapsed seconds — never round up to an artificial minimum
    const elapsedSeconds = elapsedTime
    const elapsedMinutesDecimal = elapsedSeconds / 60               // e.g. 2s → 0.033 min
    const displayMinutes = Math.floor(elapsedSeconds / 60)          // whole minutes for display
    const displaySeconds = elapsedSeconds % 60                      // remaining seconds

    // Calories proportional to EXACT time (fractional minutes), rounded to whole number
    const calories = Math.round(exercise.caloriesPerMin * elapsedMinutesDecimal)

    const newExercise = {
      id: Date.now(),
      type: exercise.name,
      duration: displayMinutes,                 // whole minutes
      duration_seconds: elapsedSeconds,         // exact seconds (for accuracy)
      duration_label: displayMinutes > 0        // human-readable label
        ? `${displayMinutes}m ${displaySeconds > 0 ? displaySeconds + 's' : ''}`.trim()
        : `${displaySeconds}s`,
      distance: distance,
      calories: calories,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }

    const updatedExercises = [...exercises, newExercise]
    const totalMinutes = updatedExercises.reduce((sum, ex) => sum + ex.duration, 0)
    const totalCalories = updatedExercises.reduce((sum, ex) => sum + ex.calories, 0)

    saveExerciseData.mutate({
      date: selectedDate,
      exercises: updatedExercises,
      total_minutes: totalMinutes,
      total_calories: totalCalories
    }, {
      onSuccess: () => {
        resetTimer()
        onClose()
      },
      onError: (error) => {
        toast.error('Failed to save exercise')
      }
    })
  }

  const deleteExercise = async (id) => {
    if (isPastDate) return
    const updatedExercises = exercises.filter(ex => ex.id !== id)
    const totalMinutes = updatedExercises.reduce((sum, ex) => sum + ex.duration, 0)
    const totalCalories = updatedExercises.reduce((sum, ex) => sum + ex.calories, 0)

    saveExerciseData.mutate({
      date: selectedDate,
      exercises: updatedExercises,
      total_minutes: totalMinutes,
      total_calories: totalCalories
    }, {
      onError: (error) => {
        console.error('Error deleting exercise:', error)
      }
    })
  }

  const getTotalStats = () => {
    const totalMinutes = exercises.reduce((sum, ex) => sum + ex.duration, 0)
    const totalCalories = exercises.reduce((sum, ex) => sum + ex.calories, 0)
    return { totalMinutes, totalCalories }
  }

  const { totalMinutes, totalCalories } = getTotalStats()

  if (isRangeMode) {
    const rangeList = Array.isArray(rangeData) ? rangeData : []

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
         {rangeList.length === 0 ? (
             <p className="text-gray-500 text-center py-8">No exercise data recorded for this period.</p>
         ) : (
             rangeList.map((day, idx) => {
                 const dayTotalMin = day.total_minutes || 0
                 const dayTotalCal = day.total_calories || 0 // Assuming backend provides this or we calculate it? Schema says total_minutes only? Let's check schema/previous usage.
                 // Actually schema for daily_exercise has total_minutes. It might not have total_calories stored at top level, but let's check exercises array.
                 const dayExercises = day.exercises || []
                 const calculatedCal = dayExercises.reduce((sum, ex) => sum + (ex.calories || 0), 0)

                 return (
                     <div key={idx} className="border border-orange-200 rounded-lg p-4 bg-white">
                         <div className="flex justify-between items-center mb-2 border-b border-orange-100 pb-2">
                             <h4 className="font-bold text-gray-800">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
                             <div className="flex gap-3 text-sm">
                                <span className="text-orange-600 font-bold">{dayTotalMin} min</span>
                                <span className="text-red-600 font-bold">{calculatedCal} cal</span>
                             </div>
                         </div>
                         {dayExercises.length > 0 ? (
                             <div className="space-y-2">
                                 {dayExercises.map((ex, exIdx) => (
                                     <div key={exIdx} className="flex justify-between items-center text-sm bg-orange-50 p-2 rounded">
                                         <span className="font-medium text-gray-700">{ex.type}</span>
                                          <span className="text-gray-500">{ex.duration_label ?? `${ex.duration}m`} &bull; {ex.calories}cal</span>
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <p className="text-xs text-gray-400 italic">No exercises logged</p>
                         )}
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

      {/* Exercise Selection - Hidden during exercise */}
      {!isExerciseActive && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Exercise Type</label>
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            disabled={isExerciseActive || isPastDate}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="">Choose exercise type...</option>
            {EXERCISE_TYPES.map(exercise => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Time Input - Hidden during exercise */}
      {!isExerciseActive && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Planned Duration <span className="text-gray-400 font-normal">(optional — timer records actual time)</span>
          </label>
          <input
            type="number"
            min="1"
            max="180"
            value={duration || ''}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            disabled={isExerciseActive || isPastDate}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Optional — e.g. 30 min"
          />
        </div>
      )}

      {/* Distance Input - Hidden during exercise */}
      {!isExerciseActive && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            Distance (km)
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-50 text-[10px] font-bold text-green-600 border border-green-100">
              <Sparkles className="w-2.5 h-2.5" /> AI Target
            </span>
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={distance}
            disabled={true} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-semibold cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            Your personalized target for this week is <span className="text-green-600 font-bold">{distance} KM</span>.
          </p>
        </div>
      )}

      {/* Timer Display - Immersive View */}
      {isExerciseActive && (
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white min-h-[300px] flex flex-col items-center justify-center p-6 text-center shadow-2xl">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
             <img 
               src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070&auto=format&fit=crop" 
               alt="Workout Motivation" 
               className="grayscale absolute inset-0 w-full h-full object-cover opacity-30"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
          </div>

          <div className="relative z-10 w-full max-w-md mx-auto space-y-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-sm font-medium animate-pulse">
                <Flame className="w-4 h-4" />
                <span>Burn those calories!</span>
              </div>
              <h3 className="text-2xl font-semibold text-slate-200 tracking-wide">
                {EXERCISE_TYPES.find(e => e.id === selectedExercise)?.name}
              </h3>
            </div>

            <div className="py-8">
               <div className="text-8xl font-black tabular-nums tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-xl font-mono">
                {formatTime(elapsedTime)}
              </div>
              <p className="text-slate-400 mt-2 font-medium">Duration</p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
               <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Est. Calories</p>
                  <p className="text-xl font-bold text-orange-400">
                    {Math.round((EXERCISE_TYPES.find(e => e.id === selectedExercise)?.caloriesPerMin || 0) * (elapsedTime / 60))}
                  </p>
               </div>
               <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Intensity</p>
                  <p className="text-xl font-bold text-blue-400">
                    {elapsedTime > 600 ? 'High' : elapsedTime > 300 ? 'Medium' : 'Warming Up'}
                  </p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Controls */}
      <div className="flex gap-3">
        {!isExerciseActive ? (
          <Button
            onClick={startExercise}
            disabled={!selectedExercise || isPastDate || isTimerLoading}
            className="flex-1 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isTimerLoading ? 'Starting...' : isPastDate ? 'Read Only' : 'Start Exercise'}
          </Button>
        ) : (
          <div className="w-full space-y-3">
            {/* Timer Error Display */}
            {timerError && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {timerError}
              </div>
            )}
            
            {/* Timed session: progress bar with secure completion */}
            {targetSeconds > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Progress</span>
                  <span>{progressPct}% &bull; {formatTime(Math.max(0, targetSeconds - elapsedTime))} left</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      background: progressPct >= 100 ? '#22c55e' : '#f97316'
                    }}
                  />
                </div>
                <p className="text-center text-xs text-slate-400 mt-1">
                  {canComplete ? 'Exercise completed! Saving...' : 'Exercise will save automatically when complete'}
                </p>
                
                {/* Security indicator */}
                <div className="text-center text-xs text-green-600 mt-2">
                  🔒 Backend validation active
                </div>
              </div>
            ) : (
              /* Free-form session (no duration set): show Finish button */
              <Button
                onClick={completeExercise}
                size="sm"
                disabled={isTimerLoading}
                className="w-full h-10 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isTimerLoading ? 'Saving...' : 'Finish Exercise'}
              </Button>
            )}
            
            {/* Cancel button for timed sessions */}
            {targetSeconds > 0 && (
              <Button
                onClick={resetTimer}
                size="sm"
                variant="outline"
                disabled={isTimerLoading}
                className="w-full"
              >
                Cancel Exercise
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
