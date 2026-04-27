import { useState, useEffect } from 'react'
import { 
  User, 
  Heart, 
  Activity, 
  Zap, 
  Droplets, 
  Scale, 
  Ruler, 
  Calendar, 
  X, 
  ChefHat, 
  Dumbbell, 
  Brain, 
  Moon,
  TrendingUp,
  ExternalLink
} from 'lucide-react'
import { supabase } from '../../services/supabase'
import { Button } from '../../components/common/Button'

export default function ProfileDetailModal({ isOpen, onClose, patientId, fullName, onSwitch }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && patientId) {
      fetchProfileDetails()
    }
  }, [isOpen, patientId])

  const fetchProfileDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch Basic Details
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single()
      
      if (pError) throw pError

      // 2. Fetch Latest Health Data (Tracking)
      const { data: tracking } = await supabase
        .from('user_daily_tracking')
        .select('*')
        .eq('profile_id', patientId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      // 3. Fetch Transformation Plan (Diet/Exercise)
      const { data: plan } = await supabase
        .from('transformation_plans')
        .select('*')
        .eq('profile_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setData({
        profile,
        tracking,
        plan: plan?.plan_data || null
      })
    } catch (err) {
      console.error('[ProfileDetail] Fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 transition-all duration-500 animate-in fade-in">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/5">
              <User className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {fullName || 'Profile Details'}
              </h2>
              <p className="text-emerald-500/60 text-xs font-black uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Comprehensive Health Audit
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-90 border border-slate-700/50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 no-scrollbar space-y-8 pb-32">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 shadow-lg shadow-emerald-500/20" />
              <p className="text-slate-400 font-bold text-sm animate-pulse">Synchronizing Patient Data...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/30 p-6 rounded-3xl text-center">
              <p className="text-rose-400 font-bold">Failed to fetch profile details</p>
              <p className="text-rose-500/60 text-xs mt-2">{error}</p>
              <Button 
                variant="outline" 
                onClick={fetchProfileDetails}
                className="mt-4 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
              >
                Retry Audit
              </Button>
            </div>
          ) : !data?.profile ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
                <User className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-400 font-bold">No Profile Data Found</p>
            </div>
          ) : (
            <>
              {/* Vitals Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Age', val: `${data.profile.age}y`, icon: <Calendar className="w-4 h-4" />, color: 'emerald' },
                  { label: 'Gender', val: data.profile.gender, icon: <User className="w-4 h-4" />, color: 'blue' },
                  { label: 'Height', val: `${data.profile.height}cm`, icon: <Ruler className="w-4 h-4" />, color: 'amber' },
                  { label: 'Weight', val: `${data.profile.weight}kg`, icon: <Scale className="w-4 h-4" />, color: 'rose' }
                ].map((stat, i) => ( stat.val && (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-3xl flex flex-col justify-between hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                       <div className={`p-1.5 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-500/60 border border-${stat.color}-500/20`}>
                        {stat.icon}
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
                    </div>
                    <p className="text-xl font-black text-white capitalize">{stat.val}</p>
                  </div>
                )))}
              </div>

              {/* BMI Card */}
              {data.profile.bmi && (
                <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/30 p-6 rounded-[2rem] flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <Activity className="w-32 h-32 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-1 block">Body Mass Index</span>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-black text-emerald-400 tracking-tighter">{data.profile.bmi}</p>
                      <span className="text-sm font-bold text-emerald-500/80 italic">{data.profile.bmi_status}</span>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="h-2 w-32 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                      <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${Math.min((data.profile.bmi/40)*100, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tighter">Normal Target: 18.5 - 25</p>
                  </div>
                </div>
              )}

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Diet & Nutrients */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-[2.25rem] p-7 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-lg shadow-orange-500/5 text-orange-500">
                      <ChefHat className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight">Diet & Nutrition</h3>
                  </div>
                  {data.plan?.diet_plan ? (
                    <div className="space-y-4">
                      {Object.keys(data.plan.diet_plan).slice(0, 3).map((meal, idx) => (
                        <div key={idx} className="flex gap-4">
                           <div className="w-1 bg-orange-500/30 rounded-full" />
                           <div>
                             <p className="text-[10px] font-black uppercase text-orange-500/60 tracking-wider mb-0.5 capitalize">{meal}</p>
                             <p className="text-sm text-slate-300 font-medium leading-relaxed italic line-clamp-2">
                               {data.plan.diet_plan[meal]}
                             </p>
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center bg-slate-900/40 rounded-2xl border border-slate-800 border-dashed">
                      <p className="text-slate-600 text-xs font-bold uppercase tracking-widest italic">No Diet Plan Calibrated</p>
                    </div>
                  )}
                </div>

                {/* Training & Activity */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-[2.25rem] p-7 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5 text-indigo-500">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight">Activity Audit</h3>
                  </div>
                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-indigo-500/60 tracking-wider block mb-1">Baseline Activity</span>
                    <p className="text-base font-black text-white capitalize tracking-tight italic">"{data.profile.activity_level || 'Moderate'}"</p>
                  </div>
                  {data.plan?.exercise_plan ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Plan Active</span>
                      </div>
                      <p className="text-sm text-indigo-200 font-medium italic line-clamp-3">
                        {data.plan.exercise_plan}
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 text-center bg-slate-900/40 rounded-2xl border border-slate-800 border-dashed">
                      <p className="text-slate-600 text-xs font-bold uppercase tracking-widest italic">No Exercise Plan Set</p>
                    </div>
                  )}
                </div>

                {/* Wellness Metrics */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-[2.25rem] p-7 space-y-6 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5 text-emerald-500">
                        <Activity className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-black text-white tracking-tight">Wellness Metadata</h3>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-full">
                       <Zap className="w-3.5 h-3.5 text-emerald-500" />
                       <span className="text-[10px] font-black text-slate-400 uppercase">Live Audit</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4 group hover:bg-slate-900 transition-all duration-300">
                      <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 group-hover:scale-110 transition-transform">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Sleep</span>
                        <p className="text-base font-black text-white">8h <span className="text-[10px] opacity-40">Avg</span></p>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4 group hover:bg-slate-900 transition-all duration-300">
                      <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 group-hover:scale-110 transition-transform">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Stress</span>
                        <p className="text-base font-black text-white">{data.profile.stress_level || 3} <span className="text-[10px] opacity-40">/ 5</span></p>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4 group hover:bg-slate-900 transition-all duration-300">
                      <div className="w-11 h-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 group-hover:scale-110 transition-transform">
                        <Heart className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">BP Status</span>
                        <p className="text-base font-black text-white">{data.profile.systolic || 120}/{data.profile.diastolic || 80}</p>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4 group hover:bg-slate-900 transition-all duration-300">
                      <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:scale-110 transition-transform">
                        <Droplets className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Hydration</span>
                        <p className="text-base font-black text-white">2.5L <span className="text-[10px] opacity-40">Avg</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Bar */}
        <div className="p-8 border-t border-slate-800 bg-slate-950/50 backdrop-blur-md absolute bottom-0 left-0 w-full z-10 flex gap-4">
           {!loading && data?.profile && (
             <>
               <Button 
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-slate-700 text-slate-400 hover:bg-slate-800 font-bold uppercase tracking-widest transition-all"
               >
                  Back
               </Button>
               <Button 
                  onClick={() => {
                    onSwitch(data.profile.id)
                    onClose()
                  }}
                  className="flex-[1.5] h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all border-0"
               >
                  Switch to this Profile
               </Button>
             </>
           )}
        </div>
      </div>
    </div>
  )
}
