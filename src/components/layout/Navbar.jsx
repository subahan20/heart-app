import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { userService } from '../../services/userService'
import { useHealthProfile } from '../../hooks/useHealthProfile'

const Navbar = () => {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const { activeProfile } = useHealthProfile()

  useEffect(() => {
    // Initial fetch
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    
    // Auth listener (allowed per requirement 10 "After login -> onboarding button becomes active")
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    
    return () => subscription.unsubscribe()
  }, [])

  const handleGoogleAuth = () => {
    navigate('/auth')
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="text-xl font-black text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">H</div>
              <span className="hidden sm:inline">HeartSafe</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {!user ? (
              <button
                id="google-auth-btn"
                onClick={handleGoogleAuth}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/pwa/google.svg" 
                  alt="" 
                  className="w-4 h-4 bg-white rounded-full p-0.5" 
                />
                Google Auth
              </button>
            ) : (
              <Link
                to="/profile"
                className="text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors px-2 py-1"
              >
                Welcome, {(() => {
                  const name = activeProfile?.name || user.email?.split('@')[0] || 'User'
                  return name.charAt(0).toUpperCase() + name.slice(1)
                })()}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
