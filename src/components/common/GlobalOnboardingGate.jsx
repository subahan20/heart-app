import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useHealthProfile } from '../../hooks/useHealthProfile'

export function GlobalOnboardingGate() {
  const { profile, loading } = useHealthProfile()
  const [authUser, setAuthUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAuthUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setAuthUser(session?.user || null))
    return () => subscription.unsubscribe()
  }, [])

  // Determine if onboarding is missing based on user request
  let needsOnboarding = false

  if (!loading) {
    if (!profile || !profile.full_name || !profile.age) {
      needsOnboarding = true
    } else if (authUser && authUser.user_metadata?.full_name) {
      // Check if the auth name is completely different from the profile name
      const authName = authUser.user_metadata.full_name.trim().toLowerCase()
      const profileName = profile.full_name.trim().toLowerCase()
      
      // If they are strictly different, user requested to treat it as a new patient
      if (authName !== profileName) {
        needsOnboarding = true
      }
    }
  }

  useEffect(() => {
    if (loading || !needsOnboarding || location.pathname === '/onboarding') return

    // Capture all clicks in the capture phase
    const captureClick = (e) => {
      // Find if they clicked an interactive element
      const target = e.target.closest('button, a, [role="button"], input, select, textarea, .cursor-pointer')
      
      // If the click is inside our own modal, allow it
      if (e.target.closest('#onboarding-gate-modal')) return

      if (target) {
        e.preventDefault()
        e.stopPropagation()
        setShowModal(true)
      }
    }

    // Use capture phase (true) so it intercepts before React's own event listeners
    document.addEventListener('click', captureClick, true) 
    return () => document.removeEventListener('click', captureClick, true)
  }, [needsOnboarding, location.pathname, loading])

  // If loading, on the onboarding page, or no need to show the modal, render nothing
  if (loading || location.pathname === '/onboarding' || !showModal) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4">
      <div id="onboarding-gate-modal" className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl max-w-sm text-center relative animate-notifZoomIn">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">👋</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Almost there!</h2>
        <p className="text-slate-600 mb-6 text-sm sm:text-base leading-relaxed">
          It looks like you're a new patient or haven't finished setting up your profile yet. Please complete onboarding to start tracking your health.
        </p>
        <button 
          onClick={() => {
            setShowModal(false)
            navigate('/onboarding')
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-full w-full shadow-lg transition-transform active:scale-95"
        >
          Complete Onboarding
        </button>
      </div>
      <style>{`
        @keyframes notifZoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-notifZoomIn {
          animation: notifZoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  )
}
