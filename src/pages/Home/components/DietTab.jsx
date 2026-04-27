import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Utensils, Sparkles, Sun, Sunrise, Moon, Coffee } from 'lucide-react'
import DietHistoryList from '../../../features/diet/DietHistoryList'
import { useTransformation } from '../../../hooks/useTransformation'

export default function DietTab({
  dailyMetrics,
  isPastDate,
  openModal,
  dateRange
}) {
  const { currentPlan } = useTransformation()
  const weekNumber = currentPlan?.week_number

  return (
    <>
      <Card className="glass-card border-0">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <CardTitle className="mb-2 sm:mb-0">Diet Tracking</CardTitle>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => openModal('todaysMeals')}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none items-center gap-2 border-green-200 text-green-700 hover:bg-green-50 px-4"
            >
              <Utensils className="w-4 h-4" />
              Today's Meals
            </Button>
            <Button 
              onClick={() => openModal('weeklyDiet')}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Weekly Plan
            </Button>
            <Button 
              onClick={() => openModal('insights')}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none items-center gap-2 border-green-200 text-green-700 hover:bg-green-50 px-4"
            >
              <Sparkles className="w-4 h-4" />
              Summary
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {(!dailyMetrics.dietData?.meals || 
            (Object.keys(dailyMetrics.dietData.meals).length === 0) ||
            (Object.values(dailyMetrics.dietData.meals).every(arr => !arr || arr.length === 0))) ? (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-gray-100 border-dashed text-center">
              <Utensils className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No meals logged</h3>
              <p className="text-gray-500 mb-6 max-w-sm">Please log your today meals to keep track of your nutrition and stay on top of your goals.</p>
              <Button onClick={() => openModal('diet')} className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all">
                Log Your First Meal
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { name: 'Breakfast', icon: Sunrise, bg: 'from-orange-50 to-amber-50', border: 'border-orange-100', text: 'text-orange-700', iconColor: 'text-orange-500', items: dailyMetrics.dietData.meals.breakfast },
                { name: 'Lunch', icon: Sun, bg: 'from-amber-50 to-yellow-50', border: 'border-yellow-100', text: 'text-amber-700', iconColor: 'text-yellow-500', items: dailyMetrics.dietData.meals.lunch },
                { name: 'Dinner', icon: Moon, bg: 'from-teal-50 to-emerald-50', border: 'border-teal-100', text: 'text-teal-700', iconColor: 'text-teal-500', items: dailyMetrics.dietData.meals.dinner },
                { name: 'Snacks', icon: Coffee, bg: 'from-pink-50 to-rose-50', border: 'border-pink-100', text: 'text-pink-700', iconColor: 'text-pink-500', items: dailyMetrics.dietData.meals.snacks }
              ].map(meal => {
                const totalCalories = meal.items ? meal.items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0) : 0;
                const isCompleted = meal.items && meal.items.length > 0;
                
                return (
                  <div key={meal.name} className={`relative group overflow-hidden p-6 rounded-2xl bg-gradient-to-br ${meal.bg} border ${meal.border} transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${isCompleted ? 'opacity-90' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 bg-white/60 rounded-xl backdrop-blur-sm shadow-sm ${meal.iconColor}`}>
                          <meal.icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <h3 className={`font-bold ${meal.text}`}>{meal.name}</h3>
                          {isCompleted && (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-green-600 animate-pulse">
                              <span>✅</span> Logged
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold bg-white/60 px-2.5 py-1 rounded-full text-gray-700 shadow-sm">{totalCalories} cal</span>
                    </div>
                    {isCompleted ? (
                      <ul className="space-y-2 mt-4">
                        {meal.items.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex justify-between items-center bg-white/40 px-3 py-2 rounded-lg">
                            <span className="truncate pr-2 font-medium">{item.food_name || item.name}</span>
                            <span className="text-xs font-bold text-gray-500">{item.calories}</span>
                          </li>
                        ))}
                        {meal.items.length > 3 && (
                          <li className="text-xs text-center text-gray-500 pt-2 font-medium">+ {meal.items.length - 3} more items</li>
                        )}
                      </ul>
                    ) : (
                      <div className="text-center py-6">
                        <p className={`text-sm ${meal.text} opacity-60 font-medium`}>No items logged</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex justify-center sm:justify-end">
            <Button 
              onClick={() => openModal('diet')} 
              disabled={isPastDate}
              className="w-full sm:w-[300px]"
            >
              {isPastDate ? 'Diet History' : `Log Your Meals${weekNumber ? ` (Week ${weekNumber})` : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diet History Section */}
      <div className="sticky top-[64px] z-10 bg-gray-50/80 backdrop-blur-md py-4 mb-4 mt-8 flex items-center gap-2">
        <Utensils className="w-5 h-5 text-green-600" />
        <h3 className="text-xl font-bold text-slate-800">
          Diet History {dateRange[0] && dateRange[1] && `(Range: ${Array.isArray(dailyMetrics.dietData) ? dailyMetrics.dietData.length : 0} days)`}
        </h3>
      </div>
      <div className="no-scrollbar overflow-y-auto max-h-[500px]">
        <DietHistoryList 
          data={dateRange[0] && dateRange[1] 
            ? dailyMetrics.dietData 
            : (dailyMetrics.dietData ? [dailyMetrics.dietData] : [])
          } 
        />
      </div>
    </>
  )
}
