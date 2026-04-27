import React from 'react'
import { Flame, CheckCircle2, Sparkles, Star, Trophy } from 'lucide-react'

export default function CelebrationOverlays({ 
  streakCount, 
  celebration, 
  congratsType, 
  getCongratsMessage 
}) {
  return (
    <>
      {/* Daily Streak Achievement (Centered) */}
      {celebration.showStreakCelebration && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500"></div>
          
          <div className="relative animate-in zoom-in-95 spin-in-1 duration-700 ease-out flex flex-col items-center max-w-sm w-full">
            {/* Massive Glowing Flame */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-orange-500 rounded-full blur-3xl opacity-40 animate-pulse"></div>
              <div className="relative bg-white/10 backdrop-blur-xl p-8 rounded-full border border-white/20 shadow-2xl">
                <Flame className="w-24 h-24 text-orange-500 fill-orange-400 drop-shadow-[0_0_20px_rgba(249,115,22,0.6)]" />
              </div>
              <div className="absolute -top-4 -right-4 animate-bounce">
                <Sparkles className="w-10 h-10 text-yellow-400" />
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-md p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-orange-100 text-center w-full transform -rotate-1">
              <div className="flex justify-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-400 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">SHREDDING IT!</h2>
              <p className="text-lg font-bold text-orange-600 bg-orange-50 py-2 px-4 rounded-xl inline-block">Day {streakCount} Streak Reached!</p>
              
              <div className="mt-6 flex gap-4 justify-center">
                <Sparkles className="w-6 h-6 text-orange-400 animate-ping" />
                <Sparkles className="w-6 h-6 text-yellow-400 animate-ping delay-300" />
                <Sparkles className="w-6 h-6 text-orange-400 animate-ping delay-700" />
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
