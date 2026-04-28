import { useState, useMemo, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useNavigate, useLocation } from 'react-router-dom'
import { DISEASE_LABELS, ACTIVITY_LEVELS } from '../constants/health'
import { useHealthProfile } from '../hooks/useHealthProfile'
import { useTransformation } from '../hooks/useTransformation'
import { supabaseNotificationService } from '../services/supabaseNotifications'
import { aiService } from '../services/aiService'
import { supabase } from '../services/supabase'
import { User, Activity, Heart, CheckCircle2, ChevronRight, ChevronLeft, Droplets, Calendar, Weight, Ruler } from 'lucide-react'
import { userService } from '../services/userService'

// ── Step metadata ──────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Personal',  icon: <User className="w-5 h-5" /> },
  { id: 2, label: 'Lifestyle', icon: <Activity className="w-5 h-5" /> },
  { id: 3, label: 'Health',    icon: <Heart className="w-5 h-5" /> },
  { id: 4, label: 'Review',    icon: <CheckCircle2 className="w-5 h-5" /> }
]

// ── BMI category display colours (dark-theme tokens) ────────────
const BMI_DARK_COLORS = {
  Underweight: { color: 'text-blue-400',    border: 'border-blue-400/30',    bg: 'bg-blue-400/10'    },
  Normal:      { color: 'text-emerald-400', border: 'border-emerald-400/30', bg: 'bg-emerald-400/10' },
  Overweight:  { color: 'text-amber-400',   border: 'border-amber-400/30',   bg: 'bg-amber-400/10'   },
  Obese:       { color: 'text-rose-400',    border: 'border-rose-400/30',    bg: 'bg-rose-400/10'    },
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { activeProfile: profile, updateProfile, loading: profileLoading } = useHealthProfile()
  const { generateFirstPlan } = useTransformation()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const location = useLocation()
  const mode = new URLSearchParams(location.search).get('mode')
  const isAddMode = mode === 'add'

  const [formData, setFormData] = useState({
    name: '', age: '', gender: '',
    height: '',       // stored in user's chosen unit until submit
    heightUnit: 'cm', // 'cm' or 'inches'
    weight: '',       // always kg
    activityLevel: '', sleepHours: '', stressLevel: 3, diseases: [],
    systolic: '', diastolic: '', pulse: '', bloodSugar: ''
  })

  const set = (field, value) => setFormData(p => ({ ...p, [field]: value }))

  // ── Manual Input Only ──
  // User input in the onboarding form is preserved; no auto-filling from Auth metadata.
  const toggleDisease = (d) =>
    setFormData(p => ({
      ...p,
      diseases: p.diseases.includes(d) ? p.diseases.filter(x => x !== d) : [...p.diseases, d]
    }))

  // ── Real-time BMI (cm or inches → always kg)
  const bmi = useMemo(() => {
    const h = parseFloat(formData.height)
    const w = parseFloat(formData.weight)
    if (!h || !w || h <= 0 || w <= 0) return null
    // Convert height to metres
    const hm = formData.heightUnit === 'inches' ? h * 0.0254 : h / 100
    const val = w / (hm * hm)
    return isNaN(val) || val <= 0 ? null : val.toFixed(1)
  }, [formData.height, formData.weight, formData.heightUnit])

  const info = useMemo(() => {
    if (!bmi) return null
    const v = parseFloat(bmi)
    if (v < 18.5) return { label: 'Underweight', color: 'text-blue-400',    border: 'border-blue-400/30',    bg: 'bg-blue-400/10'    }
    if (v < 25)   return { label: 'Normal',      color: 'text-emerald-400', border: 'border-emerald-400/30', bg: 'bg-emerald-400/10' }
    if (v < 30)   return { label: 'Overweight',  color: 'text-amber-400',   border: 'border-amber-400/30',   bg: 'bg-amber-400/10'   }
    return               { label: 'Obese',        color: 'text-rose-400',    border: 'border-rose-400/30',    bg: 'bg-rose-400/10'    }
  }, [bmi])

  const checkAndCreateAlerts = async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    const guestSessionId = !user ? aiService.getChatSessionId() : null
    const userId = user?.id || null

    const alerts = []
    const systolic = parseInt(data.systolic)
    const diastolic = parseInt(data.diastolic)
    const sugar = parseInt(data.bloodSugar)

    if (systolic >= 180 || diastolic >= 120) {
      alerts.push({ category: 'bp', type: 'alert', title: 'Critical Blood Pressure!', message: `Your BP of ${systolic}/${diastolic} is critically high. Please consult a doctor immediately.` })
    } else if (systolic >= 140 || diastolic >= 90) {
      alerts.push({ category: 'bp', type: 'warning', title: 'High Blood Pressure', message: `Your BP of ${systolic}/${diastolic} is elevated. Consider monitoring your levels.` })
    }

    if (sugar >= 126) {
      alerts.push({ category: 'sugar', type: 'alert', title: 'Critical Blood Sugar!', message: `Your blood sugar of ${sugar} mg/dL is critically high.` })
    } else if (sugar >= 100) {
      alerts.push({ category: 'sugar', type: 'warning', title: 'High Blood Sugar', message: `Your blood sugar of ${sugar} mg/dL is elevated.` })
    }

    for (const alert of alerts) {
      await supabaseNotificationService.createNotification(
        userId, guestSessionId, alert.category, alert.type, alert.title, alert.message,
        { onboarding: true, values: { systolic, diastolic, sugar } }
      )
    }
  }

  // Removed pre-fill as requested by user

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Always store height as cm and weight as kg
      let normHeightCm = parseFloat(formData.height) || 0
      if (formData.heightUnit === 'inches') {
        normHeightCm = Math.round(normHeightCm * 2.54)
      }
      const normWeightKg = parseFloat(formData.weight) || 0

      const profileData = { 
        name: formData.name || null,
        age: parseInt(formData.age) || null,
        gender: formData.gender || null,
        height: normHeightCm || null,
        weight: normWeightKg || null,
        bmi: parseFloat(bmi) || null,
        activity_level: formData.activityLevel || null,
        sleep_hours: parseInt(formData.sleepHours) || null,
        stress_level: parseInt(formData.stressLevel) || null,
        blood_sugar: parseInt(formData.bloodSugar) || null,
        systolic: parseInt(formData.systolic) || null,
        diastolic: parseInt(formData.diastolic) || null,
        pulse: parseInt(formData.pulse) || null,
        diseases: formData.diseases || [],
        onboarding_complete: true
      }
      
      // CRITICAL: Pass profile?.id or null. 
      // useHealthProfile will now auto-switch to INSERT if id is missing.
      const targetId = profile?.id && profile.id !== 'undefined' ? profile.id : null
      await updateProfile(targetId, profileData, isAddMode)
      
      toast.info('🚀 Personalizing your heart-health plan...')
      await generateFirstPlan(profileData)
      await checkAndCreateAlerts(formData)

      toast.success('✅ Profile saved and Plan generated!')
      await userService.completeOnboarding()
      navigate('/dashboard')
    } catch (e) {
      toast.error('❌ ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center font-sans overflow-hidden py-12 px-4 sm:px-6">
      
      {/* ── Premium Animated Background ── */}
      <div className="absolute inset-0 z-0">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2500&auto=format&fit=crop')` }}
        />
        {/* Dark Overlays */}
        <div className="absolute inset-0 bg-slate-950/80"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col gap-8">
        
        {/* The Glass Container */}
        <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden relative">
          
          {/* Top Progress Bar */}
          <div className="h-1.5 w-full bg-slate-800 absolute top-0 left-0">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>

          <div className="p-6 sm:p-10">
            
            {/* Nav Steps */}
            <div className="flex justify-between items-center mb-10 relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 -z-10 rounded-full" />
              {STEPS.map((s) => (
                <div key={s.id} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-lg ${
                    step >= s.id 
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/30' 
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}>
                    {s.icon}
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider hidden sm:block ${
                    step >= s.id ? 'text-emerald-400' : 'text-slate-500'
                  }`}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="min-h-[300px]">
              {/* ── Step 1: Personal ── */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {isAddMode ? 'Add Family Member' : "Let's get to know you"}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      {isAddMode ? 'Create a separate health profile for someone else.' : 'Basic details help us calibrate your unique baseline.'}
                    </p>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                      <input 
                        className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-600" 
                        placeholder="e.g. Rahul Sharma"
                        value={formData.name} onChange={e => set('name', e.target.value)} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Age</label>
                        <input type="number" 
                          className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-600" 
                          placeholder="Years"
                          value={formData.age} onChange={e => set('age', e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gender</label>
                        <select 
                          className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none" 
                          value={formData.gender} onChange={e => set('gender', e.target.value)}
                        >
                          <option value="" className="bg-slate-900">Select</option>
                          <option value="male" className="bg-slate-900">Male</option>
                          <option value="female" className="bg-slate-900">Female</option>
                          <option value="other" className="bg-slate-900">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* ── Height with cm / inches toggle ── */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Height</label>
                        {/* Unit pill toggle */}
                        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 gap-0.5">
                          {['cm', 'inches'].map(u => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => set('heightUnit', u)}
                              className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 ${
                                formData.heightUnit === u
                                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 pr-16 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                          placeholder={formData.heightUnit === 'cm' ? 'e.g. 170' : 'e.g. 67'}
                          value={formData.height}
                          onChange={e => set('height', e.target.value)}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                          {formData.heightUnit}
                        </span>
                      </div>
                      {formData.heightUnit === 'inches' && formData.height && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          ≈ {Math.round(parseFloat(formData.height) * 2.54)} cm
                        </p>
                      )}
                    </div>

                    {/* ── Weight (always kg) ── */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Weight</label>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                          placeholder="e.g. 70"
                          value={formData.weight}
                          onChange={e => set('weight', e.target.value)}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">kg</span>
                      </div>
                    </div>

                    {/* ── Live BMI card ── */}
                    <div>
                      {bmi && info ? (
                        <div className={`flex items-center justify-between px-5 py-3.5 rounded-xl border ${info.border} ${info.bg}`}>
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Your BMI</span>
                            <span className="text-xs text-slate-500">{info.label}</span>
                          </div>
                          <span className={`text-3xl font-black ${info.color}`}>{bmi}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/30 text-slate-600 text-xs font-bold uppercase tracking-wider">
                          Enter height &amp; weight to see BMI
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Lifestyle ── */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Your Lifestyle</h2>
                    <p className="text-slate-400 text-sm">Tell us about your daily routines and habits.</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Activity Level</label>
                      <select 
                        className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none" 
                        value={formData.activityLevel} onChange={e => set('activityLevel', e.target.value)}
                      >
                        <option value="" className="bg-slate-900">Select...</option>
                        {ACTIVITY_LEVELS.map(l => (
                          <option key={l.value} value={l.value} className="bg-slate-900 py-2">{l.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sleep Duration</label>
                      <div className="relative">
                        <input type="number" 
                          className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl pl-4 pr-16 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600" 
                          placeholder="e.g. 7"
                          value={formData.sleepHours} onChange={e => set('sleepHours', e.target.value)} 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">hrs/night</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Daily Stress Level</label>
                      <div className="flex justify-between items-center gap-2 bg-slate-950/50 border border-slate-700 p-2 rounded-xl">
                        {[1,2,3,4,5].map(l => (
                          <button key={l} type="button" onClick={() => set('stressLevel', l)}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all duration-200 ${
                              formData.stressLevel === l 
                                ? l <= 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                                  : l === 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' 
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                                : 'bg-transparent text-slate-500 hover:bg-slate-800 border border-transparent'
                            }`}>
                            {l}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-2 px-2 text-xs font-semibold uppercase tracking-wider">
                        <span className="text-emerald-400">Low</span>
                        <span className="text-rose-400">High</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Health ── */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Health Metrics & Conditions</h2>
                    <p className="text-slate-400 text-sm">Vital signs and pre-existing conditions.</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Known Conditions</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(DISEASE_LABELS).map(([value, label]) => {
                          const active = formData.diseases.includes(value)
                          return (
                            <button key={value} type="button" onClick={() => toggleDisease(value)}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                                active 
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20' 
                                  : 'bg-slate-950/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                              }`}>
                              {active ? '✓ ' : ''}{label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">BP Systolic</label>
                        <input type="number" 
                          className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/50 transition-all placeholder:text-slate-600" 
                          placeholder="e.g. 120"
                          value={formData.systolic} onChange={e => set('systolic', e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">BP Diastolic</label>
                        <input type="number" 
                          className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/50 transition-all placeholder:text-slate-600" 
                          placeholder="e.g. 80"
                          value={formData.diastolic} onChange={e => set('diastolic', e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pulse Rate</label>
                        <input type="number" 
                          className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/50 transition-all placeholder:text-slate-600" 
                          placeholder="bpm"
                          value={formData.pulse} onChange={e => set('pulse', e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Blood Sugar</label>
                        <input type="number" 
                          className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/50 transition-all placeholder:text-slate-600" 
                          placeholder="mg/dL"
                          value={formData.bloodSugar} onChange={e => set('bloodSugar', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4: Review ── */}
              {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Ready to align?</h2>
                    <p className="text-slate-400 text-sm">Review your details before we build your plan.</p>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-800">
                      <div><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Name</span><span className="text-slate-200 font-medium">{formData.name}</span></div>
                      <div><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Age / Gender</span><span className="text-slate-200 font-medium">{formData.age} / {formData.gender}</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-800">
                      <div><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Height & Weight</span><span className="text-slate-200 font-medium">{formData.height} cm / {formData.weight} kg</span></div>
                      <div><span className="text-xs font-bold text-slate-500 uppercase block mb-1">BMI</span>
                        {info ? <span className={`font-black ${info.color}`}>{bmi} ({info.label})</span> : <span className="text-slate-500">N/A</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800">
                      <div><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Activity & Sleep</span><span className="text-slate-200 font-medium">{ACTIVITY_LEVELS.find(l => l.value === formData.activityLevel)?.label || '—'}, {formData.sleepHours} hrs</span></div>
                      <div><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Stress Level</span><span className="text-slate-200 font-medium">{formData.stressLevel} / 5</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800">
                      <div><span className="text-xs font-bold text-slate-500 uppercase block mb-1">BP & Pulse</span><span className="text-slate-200 font-medium">{formData.systolic}/{formData.diastolic}, {formData.pulse} bpm</span></div>
                      <div><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Blood Sugar</span><span className="text-slate-200 font-medium">{formData.bloodSugar} mg/dL</span></div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Pre-existing Conditions</span>
                      <div className="flex flex-wrap gap-2">
                        {formData.diseases.length > 0 ? formData.diseases.map(d => (
                          <span key={d} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-2 py-1 rounded-md">{DISEASE_LABELS[d]}</span>
                        )) : <span className="text-slate-400 text-sm">None reported</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-10 flex items-center justify-between border-t border-slate-800 pt-6">
              {step > 1 ? (
                <button 
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : <div></div>}

              {step < 4 ? (
                <button 
                  onClick={() => {
                    if (step === 1) {
                      if (!formData.name || !formData.age || !formData.gender) return toast.warning('Please fill in your name, age and gender.')
                      if (!formData.height || !formData.weight) return toast.warning('Please enter your height and weight.')
                    }
                    if (step === 2 && !formData.activityLevel) return toast.warning('Please fill out your activity level')
                    setStep(s => s + 1)
                  }}
                  className="flex items-center gap-2 group px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
                >
                  Continue <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="flex items-center gap-2 group px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Plan...' : 'Complete Setup'}
                </button>
              )}
            </div>

          </div>
        </div>

        <p className="text-center text-xs font-semibold text-slate-600 uppercase tracking-widest">
          Your data is encrypted and secure 🔒
        </p>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 10s infinite alternate;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        /* Number Input removal arrows */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>
    </div>
  )
}
