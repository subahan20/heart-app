import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './services/supabase'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import About from './pages/About'
import Contact from './pages/Contact'
import HealthConditions from './pages/HealthConditions'
import Analytics from './pages/Analytics'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import HealthChat from './features/chat/HealthChat'
import NotFound from './pages/NotFound'
import OfflineStatus from './components/common/OfflineStatus'
import { GlobalOnboardingGate } from './components/common/GlobalOnboardingGate'
import './index.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <Router>
      <OfflineStatus />
      <GlobalOnboardingGate />
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route 
          path="/onboarding" 
          element={<Onboarding />} 
        />
        <Route 
          path="/" 
          element={<Home />} 
        />
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/onboarding" />} 
        />
        <Route 
          path="/about" 
          element={<About />} 
        />
        <Route 
          path="/contact" 
          element={<Contact />} 
        />
        <Route 
          path="/health-conditions" 
          element={<HealthConditions />} 
        />
        <Route 
          path="/analytics" 
          element={<Analytics />} 
        />
        <Route 
          path="/conditions/high-bp" 
          element={<HealthConditions />} 
        />
        <Route 
          path="/conditions/diabetes" 
          element={<HealthConditions />} 
        />
        <Route 
          path="/conditions/thyroid" 
          element={<HealthConditions />} 
        />
        <Route 
          path="/pcos-diet-plan" 
          element={<HealthConditions />} 
        />
        <Route 
          path="/indian-food-for-thyroid" 
          element={<HealthConditions />} 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <HealthChat />
    </Router>
  )
}

export default App
