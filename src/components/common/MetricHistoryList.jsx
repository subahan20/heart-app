import { 
  ChevronDown, 
  ChevronUp, 
  Moon,
  Droplets,
  Brain,
  Calendar
} from 'lucide-react'
import { useState } from 'react'

const METRIC_CONFIG = {
  sleep: {
    icon: Moon,
    color: 'text-indigo-500 bg-indigo-100',
    unit: 'h',
    label: 'Sleep Duration',
    getValue: (day) => day.duration_hours || 0,
    getSubtitle: (day) => day.sleep_time && day.wake_time ? `${day.sleep_time} - ${day.wake_time}` : 'No schedule set'
  },
  water: {
    icon: Droplets,
    color: 'text-blue-500 bg-blue-100',
    unit: 'glasses',
    label: 'Water Intake',
    getValue: (day) => day.glasses || 0,
    getSubtitle: (day) => `${(day.glasses || 0) * 250}ml total`
  },
  stress: {
    icon: Brain,
    color: 'text-purple-500 bg-purple-100',
    unit: '/5',
    label: 'Stress Level',
    getValue: (day) => day.stress_level || 0,
    getSubtitle: (day) => `${day.breathing_sessions || 0} breathing sessions`
  }
}

export default function MetricHistoryList({ data, type = 'sleep' }) {
  const config = METRIC_CONFIG[type]
  const Icon = config.icon
  
  // Ensure data is always an array
  const safeData = Array.isArray(data) ? data : (data ? [data] : [])
  
  // Determine if this is range mode
  const isRangeMode = safeData.length > 1
  
  // Remove duplicate dates
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

  if (!uniqueData || uniqueData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-white/50 rounded-xl border border-dashed border-gray-300 mt-3">
        <Icon className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No {type} history available for this period.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {uniqueData.map((day, idx) => {
        const dateStr = day.date
        const isExpanded = isRangeMode ? expandedDates[dateStr] : true
        const value = config.getValue(day)
        const subtitle = config.getSubtitle(day)

        return (
          <div key={dateStr} className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div 
              onClick={() => isRangeMode && toggleDate(dateStr)}
              className={`w-full flex items-center justify-between p-4 ${isRangeMode ? 'bg-slate-50/50 hover:bg-slate-100/50 transition-colors border-b border-gray-100 cursor-pointer' : `bg-gradient-to-r ${config.color.split(' ')[1].replace('100', '50')}`}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <div className="font-bold text-slate-700 leading-tight">
                    {new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                    {value} <span className="text-xs font-normal text-slate-500">{config.unit}</span>
                    {type === 'sleep' && value > 0 && (() => {
                      let quality = { text: 'Poor', color: 'text-red-600 bg-red-50 border-red-100' }
                      if (value >= 7 && value <= 9) quality = { text: 'Good', color: 'text-green-600 bg-green-50 border-green-100' }
                      else if (value >= 6 && value < 7) quality = { text: 'Fair', color: 'text-yellow-600 bg-yellow-50 border-yellow-100' }
                      else if (value > 9) quality = { text: 'Too Much', color: 'text-blue-600 bg-blue-50 border-blue-100' }
                      return (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold uppercase tracking-wider ${quality.color}`}>
                          {quality.text}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{config.label}</div>
                  <div className="text-[10px] text-slate-500">{subtitle}</div>
                </div>
                {isRangeMode && (
                  isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Detailed view for range mode if needed, but for simple metrics we might just show the card */}
            {isRangeMode && isExpanded && (
               <div className="p-4 bg-white/30 border-t border-white/20">
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{config.label} Summary</span>
                    <span className="font-bold text-slate-700">{value} {config.unit}</span>
                 </div>
                 <div className="mt-1 text-[10px] text-slate-400 italic">
                    {subtitle}
                 </div>
               </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
