import { 
  ChevronDown, 
  ChevronUp, 
  Dumbbell,
  Flame,
  Clock,
  Activity,
  Zap,
  Timer
} from 'lucide-react'
import { useState } from 'react'

const EXERCISE_ICONS = {
  walking: Activity,
  running: Zap,
  cycling: Activity,
  swimming: Activity,
  yoga: Activity,
  strength: Dumbbell,
  cardio: Flame,
  sports: Activity
}

const EXERCISE_COLORS = {
  walking: 'text-green-500 bg-green-100',
  running: 'text-orange-500 bg-orange-100',
  cycling: 'text-blue-500 bg-blue-100',
  swimming: 'text-cyan-500 bg-cyan-100',
  yoga: 'text-purple-500 bg-purple-100',
  strength: 'text-red-500 bg-red-100',
  cardio: 'text-pink-500 bg-pink-100',
  sports: 'text-yellow-500 bg-yellow-100'
}

export default function ExerciseHistoryList({ data }) {
  // Ensure data is always an array to prevent map errors
  const safeData = Array.isArray(data) ? data : (data ? [data] : [])
  
  // Determine if this is range mode (multiple dates) or single day based on data length
  const isRangeMode = safeData.length > 1
  
  // Remove duplicate dates to ensure each card appears only once
  const uniqueData = safeData.filter((day, index, self) => 
    index === self.findIndex((d) => d.date === day.date)
  )
  
  const [expandedDates, setExpandedDates] = useState({})

  const toggleDate = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  // Helper to get exercise type key from name
  const getExerciseTypeKey = (typeName) => {
    if (!typeName) return 'walking'
    const lower = typeName.toLowerCase()
    if (lower.includes('walk')) return 'walking'
    if (lower.includes('run')) return 'running'
    if (lower.includes('cycl')) return 'cycling'
    if (lower.includes('swim')) return 'swimming'
    if (lower.includes('yoga')) return 'yoga'
    if (lower.includes('strength') || lower.includes('gym') || lower.includes('weight')) return 'strength'
    if (lower.includes('cardio')) return 'cardio'
    if (lower.includes('sport')) return 'sports'
    return 'walking'
  }

  if (!uniqueData || uniqueData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-white/50 rounded-xl border border-dashed border-gray-300 mt-3">
        <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No exercise history available for this period.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {uniqueData.map((day, idx) => {
        const exercisesList = day.exercises || []
        const dateStr = day.date
        const isExpanded = isRangeMode ? expandedDates[dateStr] : true // Always expanded if single day
        const totalCalories = exercisesList.reduce((sum, ex) => sum + (ex.calories || 0), 0)
        const totalMinutes = exercisesList.reduce((sum, ex) => sum + (ex.duration || 0), 0)

        return (
          <div key={dateStr} className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl overflow-hidden shadow-sm">
            {/* Date Header (Always show, clickable if range mode) */}
            <div 
              onClick={() => isRangeMode && toggleDate(dateStr)}
              className={`w-full flex items-center justify-between p-4 ${isRangeMode ? 'bg-slate-50/50 hover:bg-slate-100/50 transition-colors border-b border-gray-100 cursor-pointer' : 'bg-gradient-to-r from-orange-50/50 to-red-50/50'}`}
            >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start text-left">
                     <div className="font-bold text-slate-700 leading-tight">
                       {new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                     </div>
                     <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                       {totalMinutes} MIN • {totalCalories} CAL • {exercisesList.length} SESSIONS
                     </div>
                  </div>
                </div>
                {isRangeMode && (
                  isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </div>

            {/* Exercise Items - Always show for single day, toggle for range */}
            {(!isRangeMode || isExpanded) && (
              <div className="p-4 space-y-3">
                {exercisesList.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">No exercises logged for this date.</p>
                    <p className="text-gray-300 text-xs mt-1">Start an exercise session to track your fitness.</p>
                  </div>
                ) : (
                  exercisesList.map((exercise, i) => {
                    const typeKey = getExerciseTypeKey(exercise.type)
                    const Icon = EXERCISE_ICONS[typeKey] || Dumbbell
                    const colorClass = EXERCISE_COLORS[typeKey] || 'text-gray-500 bg-gray-100'

                    return (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-all">
                        {/* Left: Icon */}
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                            <Icon className="w-8 h-8" />
                        </div>

                        {/* Middle: Exercise Type & Time */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-lg truncate">{exercise.type}</h4>
                          <p className="text-xs text-gray-500">{exercise.time}</p>
                          {exercise.distance && (
                            <p className="text-xs text-gray-500 mt-1">{exercise.distance} km</p>
                          )}
                        </div>

                        {/* Right: Stats Display */}
                        <div className="text-right text-sm shrink-0">
                          <div className="font-bold text-slate-900">{exercise.duration} <span className="text-xs font-normal text-gray-500">min</span></div>
                          
                          {/* Detailed stats */}
                          <div className="text-xs text-gray-500 flex flex-col items-end space-y-1 mt-1">
                            {/* Calories */}
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                              <span className="font-medium text-orange-600">Cal:</span> 
                              <span className="font-bold">{exercise.calories || Math.round(exercise.duration * 6)}</span>
                              <span className="text-gray-600">kcal</span>
                            </div>
                            
                            {/* Duration */}
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span className="font-medium text-blue-600">Time:</span> 
                              <span className="font-bold">{exercise.duration}</span>
                              <span className="text-gray-600">min</span>
                            </div>
                            
                            {/* Intensity if available */}
                            {exercise.intensity && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                <span className="font-medium text-red-600">Int:</span> 
                                <span className="font-bold capitalize">{exercise.intensity}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
