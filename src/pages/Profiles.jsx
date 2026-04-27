import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useHealthProfile } from '../hooks/useHealthProfile'
import { UserPlus, User, ChevronRight } from 'lucide-react'
import { toast } from 'react-toastify'

export default function Profiles() {
  const navigate = useNavigate()
  const { allProfiles, switchProfile, loading, createProfile } = useHealthProfile()
  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')

  const handleSelect = (p) => {
    // If onboarding is complete, go home, otherwise go to onboarding
    const target = p.onboarding_complete ? '/' : '/onboarding'
    switchProfile(p.id, target)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const p = await createProfile(newName)
      toast.success(`Welcome, ${p.name}!`)
      // Redirect to onboarding for the new profile
      switchProfile(p.id, '/onboarding')
    } catch (err) {
      toast.error('Failed to create profile')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center font-sans overflow-hidden py-20 px-4">
      
      {/* ── Premium Background ── */}
      <div className="absolute inset-0 z-0 bg-slate-950">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-xl text-center">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
          Who is tracking <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 text-glow">today?</span>
        </h1>
        <p className="text-slate-400 mb-12 text-lg">Select a family profile to continue.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allProfiles.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className="group relative bg-slate-900/40 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-emerald-500/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                  <User className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-lg">{p.name}</p>
                  <p className="text-slate-500 text-xs uppercase tracking-widest">Profile Activity</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-slate-700 group-hover:text-emerald-400 transition-colors" />
              </div>
            </button>
          ))}

          <button
            onClick={() => setShowCreate(true)}
            className="group relative bg-slate-950/20 border-2 border-dashed border-slate-800 hover:border-emerald-500/30 p-6 rounded-2xl transition-all flex items-center justify-center gap-4 text-slate-500 hover:text-emerald-400"
          >
            <UserPlus className="w-6 h-6" />
            <span className="font-bold">Add Profile</span>
          </button>
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">New Family Member</h3>
              <p className="text-slate-500 text-sm mb-6">Create a separate health profile with independent data.</p>
              
              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="Enter name (e.g. Rahul)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-2 px-8 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
