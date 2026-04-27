import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, TrendingUp, UserPlus, CheckCircle2, Phone, Sparkles, Activity, Clock, Trophy, User, LogOut, Eye } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import NotificationPanel from '../../../features/notifications/NotificationPanel'
import { supabase } from '../../../services/supabase'
import { userService } from '../../../services/userService'
import { useHealthProfile } from '../../../hooks/useHealthProfile'
import ProfileDetailModal from '../../../features/profiles/ProfileDetailModal'

// ── Profile Switcher Modal ───────────────────────────────────
// ── Profile Switcher Modal ───────────────────────────────────
function ProfileSwitcherModal({ isOpen, onClose, profiles, activeProfile, onSwitch, navigate, onViewDetails }) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const { createProfile } = useHealthProfile()

  if (!isOpen) return null

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const p = await createProfile(newName)
      setNewName('')
      setIsAdding(false)
      // Switch to the new profile
      const targetPath = '/onboarding'
      onSwitch(p.id, targetPath)
      onClose()
    } catch (err) {
      console.error('Failed to create profile:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-black text-white flex gap-3 items-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-500" />
            </div>
            Switch Profile
          </h2>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-2 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {profiles.length} {profiles.length === 1 ? 'Profile' : 'Profiles'} Found
          </span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30 animate-pulse delay-75" />
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                const targetPath = p.onboarding_complete ? '/' : '/onboarding'
                onSwitch(p.id, targetPath)
                onClose()
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${
                String(activeProfile?.id) === String(p.id)
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                  : 'bg-slate-800/20 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:border-slate-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all shadow-sm ${
                String(activeProfile?.id) === String(p.id)
                  ? 'bg-emerald-500 text-slate-950' 
                  : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-200'
              }`}>
                {p.name?.charAt(0).toUpperCase() || 'U'}
              </div>

              <div className="text-left flex-1">
                <p className={`font-black text-base truncate ${String(activeProfile?.id) === String(p.id) ? 'text-emerald-500' : 'text-slate-200'}`}>
                  {p.name || 'Set Name'}
                </p>
                <p className="text-xs font-bold opacity-60 uppercase tracking-widest mt-0.5">
                  {p.age || '??'}Y • {p.gender || '??'}
                </p>
              </div>

              {String(activeProfile?.id) === String(p.id) && (
                <div className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter">
                  Active
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-800">
          <Button
            onClick={() => {
              navigate('/onboarding')
              onClose()
            }}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-slate-700 text-slate-300 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400 h-12 rounded-2xl font-bold transition-all"
          >
            <Sparkles className="w-5 h-5 text-emerald-500" />
            Complete Full Onboarding
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function HomeHeader({ 
  streak, 
  navigate, 
  openModal, 
  streakCount, 
  celebration,
  profile: oldProfileProp // We'll use our hook instead to be safer
}) {
  const [user, setUser] = useState(null)
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const { activeProfile, allProfiles, switchProfile, isLoading } = useHealthProfile()
  const [viewingProfile, setViewingProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleGoogleAuth = () => {
    navigate('/auth')
  }

  // Use the active profile from our hook
  const effectiveProfile = activeProfile || oldProfileProp
  const isLoadingProfile = isLoading || effectiveProfile === undefined
  
  const lastCheckin = effectiveProfile?.last_weekly_checkin ? new Date(effectiveProfile.last_weekly_checkin) : null
  const startDate = effectiveProfile?.transformation_start_date ? new Date(effectiveProfile.transformation_start_date) : null
  const referenceDate = lastCheckin || startDate
  
  const now = new Date()
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  
  const isCheckinDisabled = isLoadingProfile || !referenceDate || (referenceDate && (now - referenceDate < oneWeek))
  
  let checkinStatusText = 'Weekly Check-in'
  if (isLoadingProfile) {
    checkinStatusText = 'Loading...'
  } else if (isCheckinDisabled && referenceDate) {
    const diff = oneWeek - (now - referenceDate)
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    checkinStatusText = days > 0 ? `Next check-in in ${days}d ${hours}h` : `Next check-in in ${hours}h`
  } else if (!referenceDate) {
    checkinStatusText = 'Start Transformation first'
  }

  return (
    <>
    <header className="glass-header shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex flex-row justify-between items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-emerald-800 tracking-tight text-shadow-sm truncate">
                HeartSafe
              </h1>
            </Link>
            
            {streakCount > 0 && (
              <div className="hidden min-[400px]:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-md border border-white/20 animate-pulse-subtle">
                <Flame className="w-4 h-4 sm:w-5 h-5 text-white fill-white" />
                <span className="text-[10px] sm:text-sm font-black text-white whitespace-nowrap">
                  {streakCount} Day Streak
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {/* Hiding Notifications, Reminders and Analytics as requested */}
            {/* 
            <div className="flex-shrink-0">
              <NotificationPanel />
            </div>
            
            <div className="group relative flex-shrink-0">
              <button
                type="button"
                onClick={() => openModal('reminders')}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/70 hover:bg-yellow-50 border border-gray-200 hover:border-yellow-300 shadow-sm transition-all duration-200"
                aria-label="Reminder Settings"
              >
                <Clock className="w-4 h-4 text-gray-600 hover:text-yellow-600" />
              </button>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                Reminders
              </div>
            </div>
            */}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar">
              {/* 
              <div className="group relative flex-shrink-0">
                <Button 
                  onClick={() => navigate('/analytics')}
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50 h-9 px-3"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden md:inline">Analytics</span>
                </Button>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 md:hidden pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Analytics
                </div>
              </div>
              */}

              {user && (
                <div className="group relative flex-shrink-0">
                  <Button 
                    onClick={() => navigate('/onboarding')}
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2 px-2 sm:px-3 h-9 transition-all duration-300 border-blue-200 text-blue-700 hover:bg-blue-50 bg-white/50 backdrop-blur-sm shadow-sm"
                  >
                    <UserPlus className="w-4 h-4 text-blue-500" />
                    <span className="hidden lg:inline">Onboarding</span>
                  </Button>
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 lg:hidden pointer-events-none transition-opacity whitespace-nowrap z-50">
                    Onboarding
                  </div>
                </div>
              )}

              <div className="group relative flex-shrink-0">
                <Button 
                  onClick={() => openModal('weeklyCheckin')}
                  variant="outline" 
                  size="sm"
                  disabled={isCheckinDisabled}
                  className={`flex items-center gap-2 px-2 sm:px-3 h-9 transition-all duration-300 ${isCheckinDisabled 
                    ? 'border-gray-200 bg-gray-50 text-gray-400 opacity-70 cursor-not-allowed' 
                    : 'border-orange-200 text-orange-700 hover:bg-orange-50 bg-white/50 backdrop-blur-sm'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${isCheckinDisabled ? 'text-gray-300' : 'text-orange-500'}`} />
                  <span className="hidden lg:inline">Check-in</span>
                </Button>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 lg:hidden pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {checkinStatusText}
                </div>
              </div>

              <div className="group relative flex-shrink-0">
                <Button 
                  onClick={() => openModal('dailyProgress')}
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white/50 backdrop-blur-sm px-2 sm:px-3 h-9"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden lg:inline">Progress</span>
                </Button>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 lg:hidden pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Daily Progress
                </div>
              </div>

              <div className="group relative flex-shrink-0">
                <Button 
                  onClick={() => openModal('bookCall')}
                  size="sm"
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm px-2 sm:px-3 h-9"
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden lg:inline">Book</span>
                </Button>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 lg:hidden pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Book a Call
                </div>
              </div>

              {streakCount >= 7 && (
                <div className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-50 px-2 sm:px-3 py-1 rounded-full border border-yellow-200 shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 cursor-default">
                  <Trophy className="w-3.5 h-3.5 sm:w-4 h-4 text-yellow-600 fill-yellow-400" />
                  <span className="font-extrabold text-yellow-800 text-[10px] sm:text-xs uppercase tracking-tight">
                    Week {Math.floor(streakCount / 7)} Gift
                  </span>
                </div>
              )}

              <div className={`flex-shrink-0 flex items-center gap-1 bg-orange-50 px-2 sm:px-3 py-1 rounded-full border border-orange-100 shadow-sm transition-all duration-300 ${celebration.isCountBumping ? 'scale-110 bg-orange-100' : 'scale-100'}`}>
                <Flame className={`w-4 h-4 sm:w-5 h-5 transition-colors ${streakCount > 0 ? 'text-orange-600 fill-orange-500' : 'text-gray-300'}`} />
                <span className="font-black text-orange-700 text-xs sm:text-sm">
                  {streakCount}
                </span>
              </div>
          </div>

          <div className="relative flex-shrink-0">
            {!user ? (
              <button
                id="google-auth-btn"
                onClick={handleGoogleAuth}
                className="flex-shrink-0 flex items-center gap-2 h-9 px-3 rounded-xl text-[10px] sm:text-xs font-black tracking-tight bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-sm active:scale-95 transition-all"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="" className="w-4 h-4" />
                Google Auth
              </button>
            ) : (
              <button
                onClick={() => setIsSwitcherOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all shadow-sm border border-emerald-100 relative group"
                aria-label="Profiles"
              >
                <User className="w-5 h-5" />
                {allProfiles.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-sm border border-white">
                    {allProfiles.length}
                  </span>
                )}
                {/* Tooltip for name */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 font-bold">
                  {effectiveProfile?.name || 'My Profile'}
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>

    <ProfileSwitcherModal 
      isOpen={isSwitcherOpen} 
      onClose={() => setIsSwitcherOpen(false)} 
      profiles={allProfiles}
      activeProfile={activeProfile}
      onSwitch={switchProfile}
      navigate={navigate}
      onViewDetails={(p) => {
        setViewingProfile(p)
      }}
    />

    <ProfileDetailModal
      isOpen={!!viewingProfile}
      onClose={() => setViewingProfile(null)}
      patientId={viewingProfile?.id}
      fullName={viewingProfile?.name}
      onSwitch={(id) => {
        switchProfile(id)
        setIsSwitcherOpen(false)
      }}
    />
    </>
  )
}
