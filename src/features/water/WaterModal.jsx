import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Button } from '../../components/common/Button'
import { Droplets } from 'lucide-react'
import { useDailyTracking } from '../../hooks/useDailyTracking'

export default function WaterModal({ onClose, selectedDate, dateRange, rangeData }) {
  const { useDailyData, saveWaterData } = useDailyTracking()
  const dailyDataQuery = useDailyData(selectedDate)
  const today = new Date().toISOString().split('T')[0]
  const isPastDate = selectedDate < today
  const [waterLevel, setWaterLevel] = useState(0)
  const [maxCapacity, setMaxCapacity] = useState(3000)

  const isRangeMode = dateRange && dateRange[0] && dateRange[1]

  // Load previously saved water level and goal
  useEffect(() => {
    if (!isRangeMode && dailyDataQuery.data?.water) {
      if (dailyDataQuery.data.water.total_ml !== undefined) {
        setWaterLevel(dailyDataQuery.data.water.total_ml)
      }
      if (dailyDataQuery.data.water.goal_ml) {
        setMaxCapacity(dailyDataQuery.data.water.goal_ml)
      }
    }
  }, [dailyDataQuery.data, isRangeMode])

  const addWater = (amount) => {
    const newLevel = Math.min(waterLevel + amount, maxCapacity)
    setWaterLevel(newLevel)
  }

  const resetWater = async () => {
    saveWaterData.mutate({
      date: selectedDate,
      glasses: 0,
      target_glasses: Math.round(maxCapacity / 250)
    }, {
      onSuccess: () => {
        setWaterLevel(0)
      }
    })
  }

  const handleSaveWater = async () => {
    const glasses = Math.floor(waterLevel / 250)
    
    try {
      await saveWaterData({
        date: selectedDate,
        glasses: glasses,
        target_glasses: Math.round(maxCapacity / 250)
      })
      onClose()
    } catch (error) {
      toast.error('Failed to save water')
    }
  }

  const percentage = (waterLevel / maxCapacity) * 100
  const remaining = maxCapacity - waterLevel
  const liters = (waterLevel / 1000).toFixed(1)
  const goalLiters = (maxCapacity / 1000).toFixed(1)

  if (isRangeMode) {
    const rangeList = Array.isArray(rangeData) ? rangeData : []

    return (
      <div className="no-scrollbar space-y-4 max-h-[60vh] overflow-y-auto pr-2">
         {rangeList.length === 0 ? (
             <p className="text-gray-500 text-center py-8">No water data recorded for this period.</p>
         ) : (
             rangeList.map((day, idx) => {
                 const dayTotalMl = day.total_ml || 0
                 const dayGoal = day.goal_ml || 3000
                 const dayPercent = Math.min((dayTotalMl / dayGoal) * 100, 100)
                 const dayLiters = (dayTotalMl / 1000).toFixed(1)

                 return (
                     <div key={idx} className="border border-blue-200 rounded-lg p-4 bg-white">
                         <div className="flex justify-between items-center mb-2">
                             <h4 className="font-bold text-gray-800">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
                             <span className="text-blue-600 font-bold">{dayLiters}L</span>
                         </div>
                         <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div 
                                className="bg-blue-500 h-2.5 rounded-full" 
                                style={{ width: `${dayPercent}%` }}
                            ></div>
                         </div>
                         <div className="text-right text-xs text-gray-500 mt-1">
                             {dayTotalMl}ml / {dayGoal}ml
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

      {/* Water Bottle Visualization */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Bottle Container */}
          <div className="w-32 h-48 border-4 border-gray-300 rounded-b-3xl relative overflow-hidden bg-white">
            {/* Water Level */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-blue-400 transition-all duration-500 ease-out"
              style={{ height: `${percentage}%` }}
            >
              {/* Water waves effect */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-blue-300 opacity-50"></div>
            </div>
            
            {/* Bottle markings */}
            <div className="absolute inset-0 flex flex-col justify-between py-2">
              <div className="text-xs text-gray-400 text-center">{goalLiters}L</div>
              <div className="text-xs text-gray-400 text-center">{(goalLiters * 0.66).toFixed(1)}L</div>
              <div className="text-xs text-gray-400 text-center">{(goalLiters * 0.33).toFixed(1)}L</div>
              <div className="text-xs text-gray-400 text-center">0L</div>
            </div>
          </div>
          
          {/* Bottle cap */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 h-4 bg-gray-400 rounded-t-lg"></div>
        </div>
      </div>

      {/* Current Status */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Droplets className="w-6 h-6 text-blue-500" />
          <span className="text-2xl font-bold text-gray-900">{liters}L</span>
        </div>
        <p className="text-sm text-gray-600">
          {remaining > 0 ? `${(remaining / 1000).toFixed(1)}L remaining / Goal: ${goalLiters}L` : 'Goal completed! 🎉'}
        </p>
        {remaining === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            🎯 Goal completed! Bottle stays full until you reset. Water level is saved even when you close the modal.
          </p>
        )}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="h-2 rounded-full transition-all duration-500 bg-blue-500"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Add Water Buttons */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700 text-center">
          {remaining > 0 ? 'Add Water:' : 'Bottle is full! Reset to start again'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => addWater(250)}
            variant="outline"
            size="sm"
            disabled={waterLevel >= maxCapacity || isPastDate}
          >
            250ml
          </Button>
          <Button
            onClick={() => addWater(500)}
            variant="outline"
            size="sm"
            disabled={waterLevel >= maxCapacity || isPastDate}
          >
            500ml
          </Button>
          <Button
            onClick={() => addWater(1000)}
            size="sm"
            variant="outline"
            disabled={waterLevel >= maxCapacity || isPastDate}
          >
            1L
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => {
            if (isPastDate) return
            if (window.confirm('Are you sure you want to reset the water bottle? This will empty it completely.')) {
              resetWater()
            }
          }}
          variant="outline"
          disabled={isPastDate}
          className="flex-1"
        >
          🔄 Reset
        </Button>
        <Button
          onClick={handleSaveWater}
          disabled={saveWaterData.isPending || isPastDate}
          className="flex-1"
        >
          {isPastDate ? 'Read Only' : saveWaterData.isPending ? 'Saving...' : 'Save & Close'}
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1"
        >
          Close
        </Button>
      </div>

      {/* Motivational Message */}
      {percentage >= 100 && (
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-green-700 font-semibold">🎊 Amazing! You reached your daily water goal!</p>
          <p className="text-sm text-green-600 mt-1">Keep up the great hydration!</p>
        </div>
      )}
    </div>
  )
}
