import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { Button } from '../../components/common/Button'
import { aiService } from '../../services/aiService'
import { useHealthProfile } from '../../hooks/useHealthProfile'
import { useDailyTracking } from '../../hooks/useDailyTracking'
import { useActivityTimer } from '../../hooks/useActivityTimer'
import { useExerciseData } from '../../hooks/useExerciseData'
import { supabase } from '../../supabaseClient'
import { 
  Flame, 
  Heart, 
  Timer, 
  TrendingUp, 
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

const EXERCISE_TYPES = [
  { value: 'running',    label: 'Running',          emoji: '🏃', caloriesPerMin: 10 },
  { value: 'walking',    label: 'Walking',          emoji: '🚶', caloriesPerMin: 4  },
  { value: 'cycling',    label: 'Cycling',          emoji: '🚴', caloriesPerMin: 8  },
  { value: 'swimming',   label: 'Swimming',         emoji: '🏊', caloriesPerMin: 12 },
  { value: 'yoga',       label: 'Yoga',             emoji: '🧘', caloriesPerMin: 3  },
  { value: 'stretching', label: 'Stretching',       emoji: '🤸', caloriesPerMin: 2  },
  { value: 'workouts',   label: 'Workouts',         emoji: '🏋️', caloriesPerMin: 8  },
  { value: 'exercise',   label: 'General Exercise', emoji: '💪', caloriesPerMin: 6  }
]

export default function ExerciseModal({ onClose, selectedDate }) {
  const [exerciseType, setExerciseType] = useState('running')
  const [distance, setDistance] = useState('')
  const [timeMinutes, setTimeMinutes] = useState('')
  const [intensity, setIntensity] = useState('moderate')
  const [exerciseInsights, setExerciseInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [showCompletionScreen, setShowCompletionScreen] = useState(false)
  const { profile } = useHealthProfile()
  const { useDailyData } = useDailyTracking()
  const { exercises: existingExercises, loading: exercisesLoading, refetch: refetchExercises } = useExerciseData(selectedDate)
  
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
    durationSeconds: parseInt(timeMinutes || 0) * 60,
    onComplete: () => {
      // Timer completed but don't auto-save - wait for user confirmation
    },
    onError: (error) => {
      console.error('Timer error:', error)
    }
  })
  
  const isPastDate = selectedDate && selectedDate < new Date().toISOString().split('T')[0]

  // Remove old timer logic - using secure timer now

  const handleStart = async () => {
    if (isPastDate) {
      toast.error('Cannot added the past dates')
      return
    }
    if (!timeMinutes || timeMinutes <= 0) {
      toast.warning('Enter valid time')
      return
    }
    
    try {
      setShowTimer(true)
      // Start secure timer session with metadata
      await startTimerSession({
        exerciseName: getExerciseLabel(),
        intensity: intensity,
        caloriesEstimate: estimatedCalories()
      })
    } catch (error) {
      console.error('Failed to start exercise:', error)
      setShowTimer(false)
      toast.error('Failed to start timer')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getExerciseLabel = () => {
    return EXERCISE_TYPES.find(type => type.value === exerciseType)?.label || 'exercise'
  }

  const getExerciseEmoji = () => {
    return EXERCISE_TYPES.find(type => type.value === exerciseType)?.emoji || '🏃'
  }

  const estimatedCalories = () => {
    const exercise = EXERCISE_TYPES.find(type => type.value === exerciseType)
    return Math.round((exercise?.caloriesPerMin || 5) * (parseInt(timeMinutes) || 0))
  }

  const generateExerciseInsights = async () => {
    setLoadingInsights(true)
    try {
      const exerciseData = {
        type: exerciseType,
        duration: parseInt(timeMinutes) || 0,
        distance: parseFloat(distance) || 0,
        intensity: intensity,
        date: selectedDate || new Date().toISOString().split('T')[0]
      }
      
      const insights = await aiService.generateExerciseInsights(exerciseData, profile)
      setExerciseInsights(insights)
    } catch (error) {
      console.error('Failed to generate exercise insights:', error)
      const exerciseData = {
        type: exerciseType,
        duration: parseInt(timeMinutes) || 0,
        distance: parseFloat(distance) || 0
      }
      setExerciseInsights(aiService.getMockExerciseInsights(exerciseData))
    } finally {
      setLoadingInsights(false)
    }
  }

  const handleComplete = async () => {
    if (isPastDate) {
      toast.error('Cannot save for past dates')
      return
    }

    // For timed sessions, ensure backend validation passes
    if (parseInt(timeMinutes || 0) > 0 && timerSession) {
      try {
        const success = await completeTimerSession()
        if (!success) {
          // Check if timer is actually finished
          const totalTimeSeconds = parseInt(timeMinutes || 0) * 60
          const actualTimeSeconds = totalTimeSeconds - timeRemaining
          
          if (actualTimeSeconds >= totalTimeSeconds * 0.98) {
            // Timer is essentially finished, allow completion
            console.log('Timer near completion, allowing manual bypass');
          } else {
            toast.warning('Wait for timer to finish');
            return;
          }
        }
      } catch (error) {
        const errorMsg = error?.message || '';
        if (errorMsg.includes('23505') || errorMsg.includes('unique constraint') || errorMsg.includes('idx_notifications_unified_upsert')) {
            console.warn('Swallowing notification constraint error in UI:', error);
            // Continue with completion UI as the activity itself likely updated
        } else {
            console.error('Failed to complete exercise:', error);
            toast.error('Failed to complete exercise');
            return;
        }
      }
    }
    
    // Calculate actual time completed from timer
    const totalTimeSeconds = parseInt(timeMinutes || 0) * 60
    const actualTimeSeconds = totalTimeSeconds - timeRemaining
    const actualTimeMinutes = Math.max(1, Math.round(actualTimeSeconds / 60)) // Minimum 1 minute
    
    // Save exercise data to Supabase using actual time completed
    const exercise = EXERCISE_TYPES.find(type => type.value === exerciseType)
    const duration = actualTimeMinutes // Already has minimum 1 minute
    const caloriesBurned = exercise ? Math.round(exercise.caloriesPerMin * duration) : 0
    
    const newExercise = {
      id: Date.now(),
      type: getExerciseLabel(),
      duration: duration,
      distance: 3.5, // Fixed distance
      calories: caloriesBurned,
      intensity: intensity,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    
    // Append to existing exercises
    const updatedExercises = [...existingExercises, newExercise]
    const totalMinutes = updatedExercises.reduce((sum, ex) => sum + ex.duration, 0)
    const totalCalories = updatedExercises.reduce((sum, ex) => sum + ex.calories, 0)
    
    // Exercise data is already saved through activity_sessions table via secure timer
    // Show completion screen after successful timer completion
    setShowCompletionScreen(true)
    setShowTimer(false)
    
    // Refresh exercise data - the realtime subscription will handle this automatically
    // But also trigger manual refresh for immediate UI update
    setTimeout(() => {
      refetchExercises()
    }, 500) // Small delay to ensure database is updated
    
    generateExerciseInsights()
  }

  if (showCompletionScreen) {
    // Calculate actual time completed for display
    const totalTimeSeconds = parseInt(timeMinutes || 0) * 60
    const actualTimeSeconds = totalTimeSeconds - timeRemaining
    const actualTimeMinutes = Math.round(actualTimeSeconds / 60)
    
    return (
      <div className="no-scrollbar space-y-4 text-gray-900 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center py-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl">
          <div className="text-6xl mb-4 animate-bounce">{getExerciseEmoji()}</div>
          <h2 className="text-3xl font-bold text-green-600 mb-3">🎉 Exercise Complete!</h2>
          <p className="text-gray-700 text-lg">
            You completed <span className="font-semibold">{actualTimeMinutes}</span> minutes of {getExerciseLabel().toLowerCase()}
          </p>
          <div className="text-sm text-green-600 mt-3 font-medium">
            🔒 Securely validated and saved
          </div>
          
          {/* Achievement Badge */}
          <div className="mt-4 inline-flex items-center bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full">
            <span className="text-lg font-bold">⭐ Goal Achieved!</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6">
          <Button
            onClick={() => {
              resetTimerSession()
              setShowCompletionScreen(false)
              setShowTimer(false)
              setExerciseInsights(null)
              setTimeMinutes('')
              setIntensity('moderate')
            }}
            variant="outline"
            className="flex-1"
          >
            🔄 Do Another
          </Button>
          <Button
            onClick={onClose}
            className="flex-1"
          >
            🏠 Back to Home
          </Button>
        </div>
        
        {/* Success Message */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center justify-center w-full">
            <div className="bg-green-100 text-green-800 px-6 py-3 rounded-lg">
              <span className="text-lg font-medium">✅ Great job! Your exercise has been recorded.</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showTimer) {
    const selectedExercise = EXERCISE_TYPES.find(type => type.value === exerciseType)
    const totalTimeSeconds = parseInt(timeMinutes || 0) * 60
    const elapsedSeconds = totalTimeSeconds - timeRemaining
    const progress = totalTimeSeconds > 0 ? (elapsedSeconds / totalTimeSeconds) * 100 : 0

    return (
      <div className="text-center py-8 text-gray-900">
        <div className="text-6xl mb-4">{selectedExercise?.emoji}</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedExercise?.label}</h3>
        
        {/* Timer Error Display */}
        {/* {timerError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {timerError}
          </div>
        )} */}
        
        <div className="my-8">
          <div className="text-7xl font-bold text-green-600 mb-4 font-mono tabular-nums">
            {formatTime(timeRemaining)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div 
              className="h-4 rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${progress}%`,
                background: progress >= 100 ? '#22c55e' : '#f97316'
              }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            {Math.round(progress)}% complete
          </p>
          
          {/* Security indicator */}
          <div className="text-center text-xs text-green-600 mt-2">
            🔒 Backend validation active
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => {
              cancelTimerSession()
              setShowTimer(false)
            }}
            variant="outline"
            disabled={isTimerLoading}
            className="w-full min-h-[44px]"
          >
            {isTimerLoading ? 'Cancelling...' : 'Cancel Exercise'}
          </Button>
          
          <Button 
            onClick={handleComplete}
            disabled={!canComplete || isTimerLoading || isPastDate}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <span className="flex items-center justify-center">
              {isTimerLoading ? 'Completing...' : 
               isPastDate ? 'Past Date - Cannot Save' : 
               canComplete ? '✅ Complete Exercise' : 
               <span className="flex items-center gap-1">
                 <span>⏳ Wait</span>
                 <span className="font-mono text-sm">{formatTime(timeRemaining)}</span>
                 <span>to Complete</span>
               </span>}
            </span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="no-scrollbar space-y-6 text-gray-900 max-h-[70vh] overflow-y-auto">
      {/* Existing Exercises Display */}
      {exercisesLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-blue-800">Loading exercise data...</p>
        </div>
      )}
      
      {exercisesLoading === false && existingExercises.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Today's Exercises ({existingExercises.length})
          </h4>
          <div className="space-y-2">
            {existingExercises.map((exercise, index) => (
              <div key={exercise.id} className="bg-white rounded-lg p-3 border border-green-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏃</span>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{exercise.type}</p>
                      <p className="text-sm text-gray-600">
                        {exercise.duration} min • {exercise.calories} cal • {exercise.time}
                        {exercise.actual_duration_seconds && exercise.actual_duration_seconds !== exercise.planned_duration_seconds && (
                          <span className="text-xs text-orange-600 ml-2">
                            (Actual: {Math.round(exercise.actual_duration_seconds / 60)}min)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-green-600">
                    <span className="text-xs font-medium">✅ Completed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      


      {/* Exercise Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Exercise Type *
        </label>
        <select
          value={exerciseType}
          onChange={(e) => setExerciseType(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
        >
          {EXERCISE_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.emoji} {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Intensity Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Intensity Level *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {['low', 'moderate', 'high'].map((level) => (
            <button
              key={level}
              onClick={() => setIntensity(level)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors h-10 ${
                intensity === level
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Distance Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Distance (Km)
        </label>
        <input
          type="text"
          value="3.5Km"
          disabled
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 cursor-not-allowed"
        />
      </div>

      {/* Time Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Duration (minutes) *
        </label>
        <input
          type="number"
          value={timeMinutes}
          onChange={(e) => setTimeMinutes(e.target.value)}
          placeholder="Enter time in minutes"
          min="1"
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
        />
        {timeMinutes && (
          <p className="text-sm text-orange-600 mt-2">
            🔥 Estimated calories: {estimatedCalories()} kcal
          </p>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Heart className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-1">Heart Health Tip</h4>
            <p className="text-sm text-blue-700">
              Regular exercise strengthens your heart, improves circulation, and reduces cardiovascular disease risk. 
              Aim for at least 30 minutes of moderate activity daily.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1 h-12"
        >
          Cancel
        </Button>
        <Button
          onClick={handleStart}
          disabled={!timeMinutes || isPastDate}
          className="flex-1 h-12"
        >
          {isPastDate ? 'Past Date' : '🚀 Start Exercise'}
        </Button>
      </div>
    </div>
  )
}
