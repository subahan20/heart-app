
import { 
  ChevronDown, 
  ChevronUp, 
  Utensils, 
  Sun, 
  Moon, 
  Coffee, 
  Sunrise, 
  Flame,
  Droplets
} from 'lucide-react'
import { useState } from 'react'

const MEAL_ICONS = {
  breakfast: Sun,
  lunch: Utensils,
  dinner: Moon,
  snacks: Coffee
}

const MEAL_COLORS = {
  breakfast: 'text-orange-500 bg-orange-100',
  lunch: 'text-blue-500 bg-blue-100',
  dinner: 'text-indigo-500 bg-indigo-100',
  snacks: 'text-emerald-500 bg-emerald-100'
}

export default function DietHistoryList({ data }) {
  // Always work with an array. If single day, data might be just the day's object, 
  // but usually for 'history' we expect an array if range, or we can wrap single day.
  
  // Ensure data is always an array to prevent map errors
  const safeData = Array.isArray(data) ? data : (data ? [data] : [])
  
  // Determine if this is range mode (multiple dates) or single day based on data length
  const isRangeMode = safeData.length > 1
  
  // Remove duplicate dates to ensure each card appears only once
  const uniqueData = safeData.filter((day, index, self) => 
    index === self.findIndex((d) => d.date === day.date)
  )
  
  // If not range mode, 'data' might be the dailyMetrics object? 
  // Let's assume the parent passes a normalized array: [{ date: '...', meals: {...} }]
  
  const [expandedDates, setExpandedDates] = useState({})

  const toggleDate = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  // Helper to flatten meals for a day
  const getMealsList = (mealsObj) => {
    if (!mealsObj) return []
    return Object.entries(mealsObj).flatMap(([type, items]) => 
      (items || []).map(item => ({ ...item, type }))
    )
  }

  if (!uniqueData || uniqueData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-white/50 rounded-xl border border-dashed border-gray-300 mt-3">
        <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No meal history available for this period.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {uniqueData.map((day, idx) => {
        const mealsList = getMealsList(day.meals)
        const dateStr = day.date
        const isExpanded = isRangeMode ? expandedDates[dateStr] : true // Always expanded if single day

        return (
          <div key={dateStr} className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl overflow-hidden shadow-sm">
            {/* Date Header (Always show, clickable if range mode) */}
            <div 
              onClick={() => isRangeMode && toggleDate(dateStr)}
              className={`w-full flex items-center justify-between p-4 ${isRangeMode ? 'bg-slate-50/50 hover:bg-slate-100/50 transition-colors border-b border-gray-100 cursor-pointer' : 'bg-gradient-to-r from-green-50/50 to-blue-50/50'}`}
            >
                <div className="flex items-center gap-3">
                  {day.food_image && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/50 shadow-sm">
                      <img src={day.food_image} alt="Daily Food" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col items-start text-left">
                     <div className="font-bold text-slate-700 leading-tight">
                       {new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                     </div>
                     <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                       {day.total_calories || 0} kcal • {mealsList.length} items
                     </div>
                  </div>
                </div>
                {isRangeMode && (
                  isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </div>

            {/* Meal Items - Always show for single day, toggle for range */}
            {(!isRangeMode || isExpanded) && (
              <div className="p-4 space-y-3">
                {mealsList.length === 0 ? (
                  <div className="text-center py-8 mt-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-300">
                      <Utensils className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">No meals logged for this date.</p>
                    <p className="text-slate-400 text-xs mt-2">Select meals from the diet modal to track your nutrition.</p>
                  </div>
                ) : (
                  mealsList.map((item, i) => {
                    const Icon = MEAL_ICONS[item.type] || Utensils
                    const colorClass = MEAL_COLORS[item.type] || 'text-gray-500 bg-gray-100'

                    return (
                      <div key={i} className="flex gap-4 p-3 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-all">
                        {/* Left: Picture/Icon */}
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${item.imageUrl ? '' : colorClass}`}>
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Icon className="w-8 h-8" />
                            )}
                        </div>

                        {/* Content Wrapper */}
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between min-w-0 gap-2">
                          
                          {/* Name & Type */}
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">{item.type}</p>
                            <h4 className="font-bold text-slate-800 text-lg truncate pr-2">{item.name}</h4>
                            {item.weight && <p className="text-xs text-gray-500">{item.weight}</p>}
                          </div>

                          {/* Nutritional Display */}
                          <div className="text-left sm:text-right text-sm shrink-0">
                            <div className="font-bold text-slate-900 inline-block mr-3 sm:mr-0 sm:block">
                              {item.calories} <span className="text-xs font-normal text-gray-500">kcal</span>
                            </div>
                            
                            {/* Nutrients List - Horizontal on Mobile, Vertical on Desktop */}
                            <div className="text-xs text-gray-500 flex flex-row flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-0 sm:space-y-1 mt-1">
                              {/* Protein */}
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <span className="font-medium text-blue-600">P:</span> 
                                <span className="font-bold">{item.protein || Math.round(item.calories * 0.15 / 4)}</span>
                                <span className="text-gray-600">g</span>
                              </div>
                              
                              {/* Carbs */}
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                <span className="font-medium text-amber-600">C:</span> 
                                <span className="font-bold">{item.carbs || Math.round(item.calories * 0.5 / 4)}</span>
                                <span className="text-gray-600">g</span>
                              </div>
                              
                              {/* Fat */}
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                <span className="font-medium text-red-600">F:</span> 
                                <span className="font-bold">{item.fat || Math.round(item.calories * 0.35 / 9)}</span>
                                <span className="text-gray-600">g</span>
                              </div>
                              
                              {/* Additional nutrients if available */}
                              {item.fiber && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                  <span className="font-medium text-green-600">Fib:</span> 
                                  <span className="font-bold">{item.fiber}</span>
                                  <span className="text-gray-600">g</span>
                                </div>
                              )}
                              
                              {item.sodium && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                  <span className="font-medium text-purple-600">Sod:</span> 
                                  <span className="font-bold">{item.sodium}</span>
                                  <span className="text-gray-600">mg</span>
                                </div>
                              )}
                              
                              {item.sugar && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                  <span className="font-medium text-orange-600">Sug:</span> 
                                  <span className="font-bold">{item.sugar}</span>
                                  <span className="text-gray-600">g</span>
                                </div>
                              )}
                            </div>
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
