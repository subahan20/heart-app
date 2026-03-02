import React, { useState, useEffect } from 'react'
import { Button } from '../../components/common/Button'
import { Weight, Droplets, Thermometer, Send, Loader2, Sparkles, CheckCircle2, Ruler, Activity } from 'lucide-react'
import { useTransformation } from '../../hooks/useTransformation'
import { useHealthProfile } from '../../hooks/useHealthProfile'

export default function WeeklyCheckinModal({ onClose }) {
  const { profile } = useHealthProfile()
  const { submitCheckin, isSubmitting } = useTransformation()
  const [step, setStep] = useState('form') // 'form', 'success'
  const [newPlan, setNewPlan] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const [formData, setFormData] = useState({
    weight: '',
    height: '',
    bloodSugar: '',
    thyroidStatus: '',
    systolic: '',
    diastolic: '',
    pulse: '',
    notes: ''
  })

  // Pre-fill from profile - Only once on load
  useEffect(() => {
    if (profile && !isInitialized) {
      setFormData(prev => ({
        ...prev,
        weight: profile.weight || '',
        height: profile.height || '',
        bloodSugar: profile.blood_sugar || '',
        thyroidStatus: profile.thyroid_status || '',
        systolic: profile.systolic || '',
        diastolic: profile.diastolic || '',
        pulse: profile.pulse || '',
      }))
      setIsInitialized(true)
    }
  }, [profile, isInitialized])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const plan = await submitCheckin(formData)
      setNewPlan(plan)
      setStep('success')
      toast.success('Check-in successful! Your new plan is ready.')
    } catch (err) {
      console.error('Check-in failed:', err)
      toast.error('Failed to complete check-in. Please check your connection and try again.')
    }
  }

  if (step === 'success') {
    return (
      <div className="space-y-6 py-4">
        {/* ... success content remains similar ... */}
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Check-in Complete!</h2>
          <p className="text-slate-500">Your Week {newPlan?.week_number} plan is ready.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Diet Focus
            </h3>
            <p className="text-sm text-emerald-800">{newPlan?.diet_plan?.focus}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {newPlan?.diet_plan?.recommended_foods?.slice(0, 3).map((f, i) => (
                <span key={i} className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Exercise
            </h3>
            <p className="text-sm text-blue-800">{newPlan?.exercise_plan?.type}</p>
            <p className="text-xs text-blue-600 mt-1">{newPlan?.exercise_plan?.duration_minutes} min • {newPlan?.exercise_plan?.intensity} intensity</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <p className="text-sm text-slate-600 leading-relaxed italic">
            "{newPlan?.suggestions}"
          </p>
        </div>

        <Button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl text-lg font-bold">
          Start New Week
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-2 max-h-[75vh] overflow-y-auto pr-2 no-scrollbar">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-center">
        <Sparkles className="w-6 h-6 text-blue-600" />
        <p className="text-sm text-blue-800 font-medium">
          Update your biometrics to get your Level-up plan for the next week.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weight & Height */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Weight className="w-4 h-4" /> Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            placeholder="e.g. 72.5"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Ruler className="w-4 h-4" /> Height (cm)
          </label>
          <input
            type="number"
            name="height"
            value={formData.height}
            onChange={handleChange}
            placeholder="e.g. 175"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
          />
        </div>

        {/* BP & Pulse Section */}
        <div className="md:col-span-2 p-4 bg-red-50/50 rounded-2xl border border-red-100 space-y-4">
           <h3 className="text-xs font-black text-red-800 uppercase tracking-widest flex items-center gap-2">
             <Activity className="w-4 h-4" /> Vitals
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Systolic (Upper Number)</label>
                <input
                  type="number"
                  name="systolic"
                  value={formData.systolic}
                  onChange={handleChange}
                  placeholder="120"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-red-400 focus:ring-4 focus:ring-red-50 transition-all outline-none bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Diastolic (Lower Number)</label>
                <input
                  type="number"
                  name="diastolic"
                  value={formData.diastolic}
                  onChange={handleChange}
                  placeholder="80"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-red-400 focus:ring-4 focus:ring-red-50 transition-all outline-none bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Pulse Rate</label>
                <input
                  type="number"
                  name="pulse"
                  value={formData.pulse}
                  onChange={handleChange}
                  placeholder="72"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-red-400 focus:ring-4 focus:ring-red-50 transition-all outline-none bg-white"
                />
              </div>
           </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Droplets className="w-4 h-4" /> Blood Sugar
          </label>
          <input
            type="text"
            name="bloodSugar"
            value={formData.bloodSugar}
            onChange={handleChange}
            placeholder="e.g. 110 mg/dL"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Thermometer className="w-4 h-4" /> Thyroid Status
          </label>
          <select
            name="thyroidStatus"
            value={formData.thyroidStatus}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none bg-white font-medium"
          >
            <option value="">Select Status</option>
            <option value="Normal">Normal</option>
            <option value="Hypothyroidism">Hypothyroidism</option>
            <option value="Hyperthyroidism">Hyperthyroidism</option>
            <option value="Under Evaluation">Under Evaluation</option>
          </select>
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Send className="w-4 h-4" /> Qualitative Notes
          </label>
          <textarea
             name="notes"
             value={formData.notes}
             onChange={handleChange}
             placeholder="How are you feeling this week? Any symptoms or achievements?"
             rows="2"
             className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none resize-none"
          />
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || !formData.weight}
          className="w-full bg-slate-900 hover:bg-black text-white h-14 rounded-2xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 text-lg font-black"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Analyzing & Leveling Up...
            </>
          ) : (
            <>
              Complete Check-in
              <Sparkles className="w-5 h-5 fill-white" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
