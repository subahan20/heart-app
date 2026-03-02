import React from 'react'
import { useTransformation } from '../../hooks/useTransformation'
import { Utensils, Sparkles, Loader2, Apple, Coffee, Moon, Sunrise } from 'lucide-react'
import { Button } from '../../components/common/Button'

export default function WeeklyDietPlanModal({ onClose }) {
  const { currentPlan, isLoadingPlan } = useTransformation()

  if (isLoadingPlan) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-slate-500 font-medium">Fetching your weekly nutrition plan...</p>
      </div>
    )
  }

  if (!currentPlan) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
          <Utensils className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-slate-500 max-w-xs mx-auto">
          No active transformation plan found. Complete your first check-in to get a personalized diet plan!
        </p>
      </div>
    )
  }

  const diet = currentPlan.diet_plan

  return (
    <div className="space-y-6 py-2 pb-6">
      <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
          <Sparkles className="w-20 h-20 text-emerald-600" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
               <Utensils className="w-5 h-5" />
             </div>
             <h3 className="text-xl font-black text-emerald-900">Week {currentPlan.week_number} Diet Focus</h3>
          </div>
          <p className="text-emerald-800 font-bold text-lg mb-2">{diet?.focus}</p>
          <p className="text-emerald-700/80 text-sm leading-relaxed italic border-l-2 border-emerald-200 pl-3">
            "{diet?.advice || 'Stay consistent with your choices!'}"
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Weekly Recommended Foods</h4>
        <div className="grid grid-cols-1 gap-3">
          {diet?.recommended_foods?.map((food, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-emerald-600 border border-slate-100 shrink-0">
                {idx % 3 === 0 ? <Apple className="w-5 h-5" /> : idx % 3 === 1 ? <Coffee className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
              </div>
              <p className="font-bold text-slate-700">{food}</p>
            </div>
          ))}
        </div>
      </div>

      {diet?.total_calories && (
        <div className="p-5 bg-slate-900 rounded-3xl text-white flex justify-between items-center shadow-lg shadow-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recommended Daily</p>
            <p className="text-2xl font-black">{diet.total_calories} <span className="text-sm font-medium text-slate-400">kcal</span></p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
             <Sunrise className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      )}

      <Button onClick={onClose} className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-100 transition-all">
        Got it!
      </Button>
    </div>
  )
}
