import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Droplets, GlassWater, Settings2 } from 'lucide-react'
import MetricHistoryList from '../../../components/common/MetricHistoryList'
import { useDailyTracking } from '../../../hooks/useDailyTracking'
import { toast } from 'react-toastify'

export default function WaterTab({
  dailyMetrics,
  isPastDate,
  openModal,
  selectedDate,
  dateRange
}) {
  const { saveWaterData } = useDailyTracking()
  const [isSettingGoal, setIsSettingGoal] = useState(false)
  
  // Goals in liters
  const goalOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
  const currentGoalLiters = dailyMetrics.waterGoal || 3
  
  const handleGoalChange = async (liters) => {
    try {
      await saveWaterData({
        date: selectedDate,
        glasses: dailyMetrics.water,
        target_glasses: Math.round(liters * 1000 / 250)
      })
      setIsSettingGoal(false)
      toast.success(`Goal set to ${liters}L`)
    } catch (error) {
      toast.error('Failed to update goal')
    }
  }

  const handleBoxClick = async (index) => {
    if (isPastDate) return

    // If clicking the current last box, maybe toggle it off? 
    // Or just set to that index + 1
    const newGlasses = index + 1
    
    try {
      await saveWaterData({
        date: selectedDate,
        glasses: newGlasses,
        target_glasses: Math.round(currentGoalLiters * 1000 / 250)
      })
    } catch (error) {
      toast.error('Failed to update water intake')
    }
  }

  const totalBoxes = Math.round((currentGoalLiters * 1000) / 250)

  return (
    <>
      <Card className="glass-card border-0 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-emerald-500" />
            Water Intake
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsSettingGoal(!isSettingGoal)}
            className="text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
          >
            <Settings2 className="w-4 h-4 mr-1" />
            Set Goal
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {isSettingGoal && (
            <div className="p-4 bg-emerald-50 rounded-2xl animate-in slide-in-from-top-2 duration-300">
              <p className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                <GlassWater className="w-4 h-4" />
                Set Your Daily Target
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {goalOptions.map(liters => (
                  <button
                    key={liters}
                    onClick={() => handleGoalChange(liters)}
                    className={`py-2 px-1 rounded-xl text-sm font-medium transition-all ${
                      currentGoalLiters === liters
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-white text-slate-600 hover:bg-emerald-100 border border-emerald-100'
                    }`}
                  >
                    {liters}L
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative group">
            <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-emerald-50/50 to-white rounded-3xl border border-emerald-100/50 shadow-inner relative">
              <div className="absolute top-4 right-6 text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Goal</p>
                <p className="text-sm font-black text-emerald-500 leading-none mt-1">{totalBoxes} <span className="text-[10px]">Glasses</span></p>
              </div>
              
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Consumed</p>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-black text-emerald-600 tracking-tighter">
                  {dailyMetrics.water || 0}
                </span>
                <span className="text-xl font-bold text-emerald-400">glasses</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm font-medium">
                <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min((dailyMetrics.water / totalBoxes) * 100, 100)}%` }}
                  />
                </div>
                <span>{Math.round((dailyMetrics.water * 250) / 100) / 10}L / {currentGoalLiters}L</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">Quick Log Intake</p>
              <span className="text-xs text-emerald-500 font-medium">1 glass = 250ml</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[0.25, 0.5, 1, 1.5, 2].map(L => (
                <button
                  key={L}
                  disabled={isPastDate}
                  onClick={() => {
                    const glassesToAdd = Math.round((L * 1000) / 250);
                    handleBoxClick(dailyMetrics.water + glassesToAdd - 1);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 transition-all text-sm font-bold shadow-sm"
                >
                  +{L}L
                </button>
              ))}
              <button
                 disabled={isPastDate}
                 onClick={() => {
                    if (window.confirm('Reset today\'s intake?')) {
                      handleBoxClick(-1); // Resets to 0
                    }
                 }}
                 className="px-4 py-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all text-sm font-medium border border-transparent"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700 flex items-center justify-between">
              <span>Your Drops Today</span>
              <span className="text-blue-600 font-mono italic">{dailyMetrics.water} Recorded</span>
            </h4>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 min-h-[4rem] p-4 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
              {dailyMetrics.water > 0 ? (
                [...Array(dailyMetrics.water)].map((_, i) => (
                  <div
                    key={i}
                    className="group relative h-16 rounded-2xl flex items-center justify-center border-2 border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-100 animate-in zoom-in duration-300"
                  >
                    <Droplets className="w-7 h-7 text-white fill-white" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-4 text-slate-400">
                  <Droplets className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs font-medium uppercase tracking-widest">No drops yet</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => openModal('water')} 
              variant="outline"
              className="flex-1 rounded-2xl h-12 border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <GlassWater className="w-5 h-5 mr-2" />
              History Details
            </Button>
            <Button 
              onClick={() => handleBoxClick(dailyMetrics.water)}
              disabled={isPastDate}
              className="flex-1 rounded-2xl h-12 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 group"
            >
              <span className="flex items-center justify-center transition-transform group-active:scale-90">
                <Droplets className="w-5 h-5 mr-2 animate-bounce" />
                Add 1 Glass
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <div className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Hydration History</h3>
              <p className="text-sm text-slate-500">Track your progress over time</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card rounded-3xl border-0 overflow-hidden shadow-sm">
          <div className="no-scrollbar overflow-y-auto max-h-[500px]">
            <MetricHistoryList 
              type="water"
              data={dateRange[0] && dateRange[1] 
                ? dailyMetrics.waterData 
                : (dailyMetrics.waterData ? [dailyMetrics.waterData] : [])
              } 
            />
          </div>
        </div>
      </div>
    </>
  )
}
