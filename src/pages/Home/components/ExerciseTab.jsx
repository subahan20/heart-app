import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Dumbbell, Flame, PersonStanding, Activity } from 'lucide-react'
import ExerciseHistoryList from '../../../features/exercise/ExerciseHistoryList'
import { formatNumber } from '../../../utils/formatters'
import { useExerciseData } from '../../../hooks/useExerciseData'

export default function ExerciseTab({
  dailyMetrics,
  isPastDate,
  openModal,
  dateRange,
  selectedDate
}) {
  const { exercises: rawExercises } = useExerciseData(selectedDate)
  
  // Format raw activity_sessions into the structure expected by the History List and Cards
  const allExercises = (rawExercises || []).map(ex => ({
    id: ex.id,
    type: ex.type || ex.exercise_name || ex.activity_type,
    duration: ex.duration || Math.round((ex.actual_duration_seconds || ex.duration_seconds || 0) / 60) || (ex.duration_seconds > 0 ? 1 : 0),
    calories: ex.calories || ex.calories_burned || 0,
    time: new Date(ex.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    distance: 0
  }))

  const formattedHistoryData = [{
    date: selectedDate || new Date().toISOString().split('T')[0],
    exercises: allExercises
  }]
  return (
    <>
      <Card className="glass-card border-0">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Exercise Tracking</CardTitle>
          <Button 
            onClick={() => openModal('todaysSessions')}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 px-4"
          >
            <Dumbbell className="w-4 h-4" />
            Today's Sessions
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Total Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-8 rounded-3xl border border-orange-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Flame className="w-24 h-24 text-orange-600" />
              </div>
              <div className="relative z-10">
                <h3 className="text-orange-800 font-bold text-lg mb-2 flex items-center gap-2">
                  <Flame className="w-5 h-5" /> Total Duration
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-orange-600">
                    {allExercises.reduce((sum, ex) => sum + (Number(ex.duration) || 0), 0)}
                  </span>
                  <span className="text-xl font-bold text-orange-400">minutes</span>
                </div>
                <p className="text-orange-700/60 font-medium mt-2">Total exercise time for today</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-8 rounded-3xl border border-emerald-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Activity className="w-24 h-24 text-emerald-600" />
              </div>
              <div className="relative z-10">
                <h3 className="text-emerald-800 font-bold text-lg mb-2 flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Total Energy
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-emerald-600">
                    {allExercises.reduce((sum, ex) => sum + (Number(ex.calories) || 0), 0)}
                  </span>
                  <span className="text-xl font-bold text-emerald-400">calories</span>
                </div>
                <p className="text-emerald-700/60 font-medium mt-2">Estimated calories burned</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center sm:justify-end">
            <Button 
              onClick={() => openModal('exercise')} 
              disabled={isPastDate}
              className="w-full sm:w-[300px]"
            >
              {isPastDate ? 'Exercise History' : '🏃 Start Exercise'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exercise History Section */}
      <div className="sticky top-[64px] z-10 bg-gray-50/80 backdrop-blur-md py-4 mb-4 mt-8 flex items-center gap-2">
        <Dumbbell className="w-5 h-5 text-orange-600" />
        <h3 className="text-xl font-bold text-slate-800">
          Exercise History {dateRange && dateRange[0] && dateRange[1] && `(Range)`}
        </h3>
      </div>
      <div className="no-scrollbar overflow-y-auto max-h-[500px]">
        <ExerciseHistoryList 
          data={dateRange && dateRange[0] && dateRange[1] 
            ? formattedHistoryData 
            : (formattedHistoryData.length > 0 ? formattedHistoryData : [])
          } 
        />
      </div>
    </>
  )
}
