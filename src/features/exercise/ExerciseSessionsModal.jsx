import React from 'react'
import { Dumbbell, Clock, Flame, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/common/Button'

export default function ExerciseSessionsModal({ 
  sessions = [], 
  onClose 
}) {
  const totalMinutes = sessions.reduce((sum, s) => sum + (Math.round((s.actual_duration_seconds || s.duration_seconds) / 60)), 0)
  const totalCalories = sessions.reduce((sum, s) => sum + (Math.round((s.actual_duration_seconds || s.duration_seconds) / 60 * 8)), 0)

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-orange-600 tracking-wider mb-1">Total Time</p>
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-orange-500" />
            <span className="text-lg font-black text-slate-800">{totalMinutes}m</span>
          </div>
        </div>
        <div className="text-center border-x border-orange-200">
          <p className="text-[10px] uppercase font-bold text-orange-600 tracking-wider mb-1">Calories</p>
          <div className="flex items-center justify-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" />
            <span className="text-lg font-black text-slate-800">{totalCalories}</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-orange-600 tracking-wider mb-1">Sessions</p>
          <div className="flex items-center justify-center gap-1">
            <Dumbbell className="w-3 h-3 text-orange-500" />
            <span className="text-lg font-black text-slate-800">{sessions.length}</span>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
        {sessions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Dumbbell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No sessions recorded for today yet.</p>
          </div>
        ) : (
          sessions.map((session, idx) => {
            const duration = Math.round((session.actual_duration_seconds || session.duration_seconds) / 60)
            const calories = Math.round(duration * 8)
            const startTime = new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

            return (
              <div key={session.id || idx} className="group relative bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 capitalize leading-tight">
                        {session.activity_type || 'Exercise'}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        Started at {startTime}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-slate-700 font-bold">
                      <span>{duration}</span>
                      <span className="text-[10px] font-medium text-slate-400">min</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-orange-600 font-bold text-sm mt-0.5">
                      <Flame className="w-3 h-3" />
                      <span>{calories}</span>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Saved</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Button onClick={onClose} className="w-full h-12 bg-slate-900 border-0 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-200">
        Close
      </Button>
    </div>
  )
}
