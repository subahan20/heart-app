import { Flame, TrendingUp, UserPlus, CheckCircle2, Phone, Sparkles, Activity, Clock } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import NotificationPanel from '../../../features/notifications/NotificationPanel'

export default function HomeHeader({ 
  streak, 
  navigate, 
  openModal, 
  streakCount, 
  celebration,
  profile
}) {
  // Calculate if check-in is disabled (exactly 1 week lockout)
  const isLoadingProfile = profile === undefined
  const lastCheckin = profile?.last_weekly_checkin ? new Date(profile.last_weekly_checkin) : null
  const startDate = profile?.transformation_start_date ? new Date(profile.transformation_start_date) : null
  const referenceDate = lastCheckin || startDate
  
  const now = new Date()
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  
  // Disable if loading, if transformation hasn't started, or if within 7 days of reference date
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
    // If no transformation started yet, maybe lead to onboarding or keep disabled
    checkinStatusText = 'Start Transformation first'
  }

  return (
    <header className="glass-header shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex flex-row justify-between items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-emerald-800 tracking-tight text-shadow-sm truncate">
              Health Tracker
            </h1>
            
            {/* Streak Badge (Mobile optimized) */}
            {streakCount > 0 && (
              <div className="hidden min-[400px]:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-md animate-pulse-subtle border border-white/20">
                <Flame className="w-4 h-4 sm:w-5 h-5 text-white fill-white" />
                <span className="text-[10px] sm:text-sm font-black text-white whitespace-nowrap">
                  {streakCount} Day Streak
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto border-r border-slate-200 pr-2 sm:pr-4">
            {/* Daily-summary notification panel */}
            <div className="flex-shrink-0">
              <NotificationPanel />
            </div>
            {/* Reminder Settings bell */}
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
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar">

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

              <div className="group relative flex-shrink-0">
                <Button 
                  onClick={() => navigate('/onboarding')}
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 h-9 px-3"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden md:inline">Onboarding</span>
                </Button>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 md:hidden pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Onboarding
                </div>
              </div>

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
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-md shadow-blue-100 px-2 sm:px-3 h-9"
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden lg:inline">Book</span>
                </Button>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 lg:hidden pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Book a Call
                </div>
              </div>

              {/* Weekly Gift Badge (Weeks Completed) */}
              {streakCount >= 7 && (
                <div className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-50 px-2 sm:px-3 py-1 rounded-full border border-yellow-200 shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 cursor-default">
                  <Trophy className="w-3.5 h-3.5 sm:w-4 h-4 text-yellow-600 fill-yellow-400" />
                  <span className="font-extrabold text-yellow-800 text-[10px] sm:text-xs uppercase tracking-tight">
                    Week {Math.floor(streakCount / 7)} Gift
                  </span>
                </div>
              )}

              {/* Streak Counter (Mobile optimized) */}
              <div className={`flex-shrink-0 flex items-center gap-1 bg-orange-50 px-2 sm:px-3 py-1 rounded-full border border-orange-100 shadow-sm transition-all duration-300 ${celebration.isCountBumping ? 'scale-110 bg-orange-100' : 'scale-100'}`}>
                <Flame className={`w-4 h-4 sm:w-5 h-5 transition-colors ${streakCount > 0 ? 'text-orange-600 fill-orange-500' : 'text-gray-300'}`} />
                <span className="font-black text-orange-700 text-xs sm:text-sm">
                  {streakCount}
                </span>
              </div>
          </div>
        </div>
      </div>
    </header>
  )
}
