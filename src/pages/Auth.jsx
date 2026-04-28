import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { userService } from '../services/userService'

const Auth = () => {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) navigate('/')
    })
  }, [navigate])

  const handleLogin = async () => {
    try {
      await userService.signInWithGoogle()
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center font-sans overflow-hidden bg-slate-950 px-4">
      
      {/* ── Premium Background ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 blur-[120px] rounded-full animate-pulse animation-delay-2000"></div>
        
        {/* Animated Grid lines */}
        {/* Background noise effect removed due to broken external link */}
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 p-8 sm:p-12 rounded-[2.5rem] shadow-2xl text-center">
          
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-12 shadow-lg shadow-emerald-500/20">
            <span className="text-4xl text-slate-950 font-black -rotate-12">H</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
            Elevate your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Health</span>
          </h1>
          <p className="text-slate-400 mb-10 text-lg font-medium">
            Your personalized heart-care journey starts here.
          </p>
          
          <button
            id="google-auth-btn"
            onClick={handleLogin}
            className="group flex items-center justify-center gap-4 w-full bg-white hover:bg-slate-100 text-slate-950 font-black py-4 px-6 rounded-2xl transition-all shadow-xl hover:shadow-emerald-500/10 active:scale-[0.98]"
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
              alt="Google" 
              className="w-6 h-6 transition-transform group-hover:scale-110"
            />
            Continue with Google
          </button>
          
          <div className="mt-12 space-y-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">
              Enterprise Grade Security 🔒
            </p>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              By continuing, you agree to our <span className="text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors">Terms of Service</span> and <span className="text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors">Privacy Policy</span>.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-slate-500 text-sm">
          Protected by <span className="text-emerald-500 font-bold">Supabase Auth</span>
        </p>
      </div>
    </div>
  )
}

export default Auth
