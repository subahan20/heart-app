import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  User, 
  Settings, 
  LogOut, 
  ArrowLeft, 
  Heart, 
  Activity, 
  Scale, 
  Ruler, 
  Calendar, 
  UserCircle,
  Stethoscope,
  Zap,
  Droplets
} from 'lucide-react'
import { Button } from '../components/common/Button'
import { useHealthProfile } from '../hooks/useHealthProfile'
import { userService } from '../services/userService'
import { supabase } from '../services/supabase'

const Profile = () => {
  const navigate = useNavigate()
  const { profile, loading } = useHealthProfile()
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (mounted) setUser(user)
      } catch (err) {
        console.error('[Profile] GetUser error:', err)
      }
    }
    fetchUser()
    return () => { mounted = false }
  }, [])

  const handleSignOut = async () => {
    await userService.signOut()
    navigate('/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  // Final safety check if user not found after loading
  if (!user && !loading) {
    navigate('/auth')
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          {/* Decorative Blob Removed for clean UI */}
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <User className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                {profile?.full_name || user.email?.split('@')[0]}
              </h1>
              <p className="text-slate-500 font-medium">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200">
                  Verified User
                </span>
                {profile?.onboarding_complete && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-200">
                    Profile Complete
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="group flex items-center gap-2 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 py-6 px-6"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </Button>
            <Button 
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-2xl py-6 px-6 font-bold shadow-none"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="md:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <UserCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Basic Information</h2>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                  <Calendar className="w-3 h-3" /> Age
                </div>
                <p className="text-xl font-black text-slate-800">{profile?.age || '—'} <span className="text-sm font-bold text-slate-400">Years</span></p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                  <User className="w-3 h-3" /> Gender
                </div>
                <p className="text-xl font-black text-slate-800 capitalize">{profile?.gender || '—'}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                  <Ruler className="w-3 h-3" /> Height
                </div>
                <p className="text-xl font-black text-slate-800">{profile?.height || '—'} <span className="text-sm font-bold text-slate-400">cm</span></p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                  <Scale className="w-3 h-3" /> Weight
                </div>
                <p className="text-xl font-black text-slate-800">{profile?.weight || '—'} <span className="text-sm font-bold text-slate-400">kg</span></p>
              </div>
            </div>
          </div>

          {/* BMI Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl shadow-emerald-200 h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Activity className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <p className="text-emerald-100 font-bold text-[10px] uppercase tracking-widest mb-1">Current</p>
              <h2 className="text-2xl font-black mb-6">BMI Index</h2>
              
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tighter">{profile?.bmi || '—'}</span>
                <span className="text-emerald-100 font-bold text-sm">Status: {profile?.bmi_status || 'Unknown'}</span>
              </div>
            </div>
            <div className="mt-8 relative z-10">
              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000" 
                  style={{ width: profile?.bmi ? `${Math.min((profile.bmi / 40) * 100, 100)}%` : '0%' }}
                ></div>
              </div>
              <p className="text-emerald-200 text-[10px] font-medium mt-2 italic">Based on your height and weight data</p>
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Vitals */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-8 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                <Stethoscope className="w-5 h-5 text-rose-500" />
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Health Vitals</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100/50 flex flex-col items-center text-center group hover:bg-rose-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-rose-500 shadow-sm mb-3">
                  <Heart className="w-5 h-5 fill-rose-500" />
                </div>
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Blood Pressure</span>
                <p className="text-2xl font-black text-rose-900">{profile?.systolic || '—'}/{profile?.diastolic || '—'}</p>
                <span className="text-[10px] font-medium text-rose-600/70">mmHg</span>
              </div>

              <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50 flex flex-col items-center text-center group hover:bg-amber-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-amber-500 shadow-sm mb-3">
                  <Droplets className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Blood Sugar</span>
                <p className="text-2xl font-black text-amber-900">{profile?.blood_sugar || '—'}</p>
                <span className="text-[10px] font-medium text-amber-600/70">mg/dL</span>
              </div>

              <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/50 flex flex-col items-center text-center group hover:bg-emerald-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm mb-3">
                  <Zap className="w-5 h-5 fill-emerald-500" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Pulse Rate</span>
                <p className="text-2xl font-black text-emerald-900">{profile?.pulse || '—'}</p>
                <span className="text-[10px] font-medium text-emerald-600/70">bpm</span>
              </div>
            </div>
          </div>

          {/* Activity & Lifestyle */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                  <Activity className="w-5 h-5 text-indigo-500" />
                </div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Lifestyle</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1 block">Activity Level</span>
                  <p className="text-base font-black text-indigo-900 capitalize italic">"{profile?.activity_level || 'Not Specified'}"</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Identified Conditions</span>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(profile?.diseases) && profile.diseases.length > 0 ? (
                      profile.diseases.map((disease, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-lg shadow-sm">
                          {disease}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-medium text-slate-400 italic">None reported</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button 
                className="w-full py-6 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 border-0 shadow-lg shadow-slate-200 font-black text-sm uppercase tracking-widest"
                onClick={() => navigate('/onboarding')}
              >
                Update Profile
              </Button>
              <Button 
                variant="outline"
                className="w-full py-6 rounded-2xl border-2 border-rose-100 text-rose-600 hover:bg-rose-50 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                onClick={async () => {
                  await userService.signOut()
                  navigate('/auth')
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Profile
