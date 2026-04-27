import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './services/supabase'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Auth from './pages/Auth'
import About from './pages/About'
import Contact from './pages/Contact'
import HealthConditions from './pages/HealthConditions'
import Analytics from './pages/Analytics'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import HealthChat from './features/chat/HealthChat'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import OfflineStatus from './components/common/OfflineStatus'
import Navbar from './components/layout/Navbar'
import { GlobalOnboardingGate } from './components/common/GlobalOnboardingGate'
import ErrorBoundary from './components/common/ErrorBoundary'
import { userService } from './services/userService'
import './index.css'

import { useHealthProfile } from './hooks/useHealthProfile'
import Profiles from './pages/Profiles'

function AppContent() {
  const { activeProfile, activeProfileId } = useHealthProfile()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const isHomePage = location.pathname === '/'
  const isAuthPage = location.pathname === '/auth'
  const isProfilesPage = location.pathname === '/profiles'

  // Removed automatic redirect to /profiles per user request to prioritize showing the Home page first.
  // Users can still select/switch profiles via the Home page or Profile Switcher.

  useEffect(() => {
    let mounted = true

    const updateStatus = async (session) => {
      try {
        const currentUser = session?.user ?? null
        if (mounted) {
          setUser(currentUser)
          queryClient.setQueryData(['user'], currentUser)
        }
      } catch (err) {
        console.error('[App] Auth change error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateStatus(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      updateStatus(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <>
      <OfflineStatus />
      <GlobalOnboardingGate />
      {!isHomePage && <Navbar />}
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Public Auth Route */}
        <Route path="/auth" element={<Auth />} />

        {/* Gated Routes (Guard will handle redirects internally) */}
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/health-conditions" element={<HealthConditions />} />
        <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/conditions/high-bp" element={<HealthConditions />} />
        <Route path="/conditions/diabetes" element={<HealthConditions />} />
        <Route path="/conditions/thyroid" element={<HealthConditions />} />
        <Route path="/pcos-diet-plan" element={<HealthConditions />} />
        <Route path="/indian-food-for-thyroid" element={<HealthConditions />} />
        
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <HealthChat />
    </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
