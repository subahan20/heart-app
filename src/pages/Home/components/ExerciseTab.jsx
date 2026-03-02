import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Dumbbell } from 'lucide-react'
import ExerciseHistoryList from '../../../features/exercise/ExerciseHistoryList'
import { formatNumber } from '../../../utils/formatters'

export default function ExerciseTab({
  dailyMetrics,
  isPastDate,
  openModal,
  dateRange
}) {
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
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-gray-100 border-dashed text-center">
            <Dumbbell className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {dailyMetrics?.exercise > 0 ? `${dailyMetrics.exercise} Minutes Logged` : 'No exercise logged'}
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm">
               {dailyMetrics?.exercise > 0 ? "Great job staying active today!" : "Start an exercise session or log your activity to keep track of your fitness goals."}
            </p>
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
          Exercise History {dateRange[0] && dateRange[1] && `(Range: ${Array.isArray(dailyMetrics.exerciseData) ? dailyMetrics.exerciseData.length : 0} days)`}
        </h3>
      </div>
      <div className="no-scrollbar overflow-y-auto max-h-[500px]">
        <ExerciseHistoryList 
          data={dateRange[0] && dateRange[1] 
            ? dailyMetrics.exerciseData 
            : (dailyMetrics.exerciseData ? [dailyMetrics.exerciseData] : [])
          } 
        />
      </div>
    </>
  )
}
