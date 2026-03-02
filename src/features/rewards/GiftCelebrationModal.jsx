import React, { useState, useEffect } from 'react';
import { X, Gift, Sparkles, Trophy, Star, ChevronRight, Heart, Flame } from 'lucide-react';
import { Button } from '../../components/common/Button';

export default function GiftCelebrationModal({ isOpen, onClose, reward }) {
  const [isOpening, setIsOpening] = useState(false);
  const [isOpened, setIsOpened] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsOpening(true), 1000);
      const timer2 = setTimeout(() => setIsOpened(true), 2500);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    } else {
      setIsOpening(false);
      setIsOpened(false);
    }
  }, [isOpen]);

  if (!isOpen || !reward) return null;

  const isEncouragement = reward.type === 'weekly_encouragement';
  const themeColor = isEncouragement ? 'orange' : 'emerald';
  const Icon = isEncouragement ? Flame : Trophy;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-500">
        
        {/* Decorative Background */}
        <div className={`absolute top-0 left-0 w-full h-48 bg-gradient-to-br ${isEncouragement ? 'from-orange-500 via-red-500 to-yellow-500' : 'from-emerald-500 via-teal-500 to-cyan-500'} opacity-20 transform -skew-y-6 -translate-y-12`}></div>
        
        <div className="absolute top-0 right-0 p-6 z-10">
          <button 
            onClick={onClose}
            className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors text-slate-500 hover:text-slate-800 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative p-8 pt-12 flex flex-col items-center text-center">
          
          {/* Animated Gift Section */}
          <div className="relative mb-10 h-48 w-48 flex items-center justify-center">
            
            {isOpened && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-ping"
                    style={{
                      backgroundColor: isEncouragement ? ['#f97316', '#ef4444', '#fbbf24', '#f59e0b'][i % 4] : ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'][i % 4],
                      transform: `rotate(${i * 30}deg) translateY(-80px)`,
                      animationDelay: `${i * 100}ms`,
                      animationDuration: '2s'
                    }}
                  />
                ))}
              </div>
            )}

            <div className={`relative transition-all duration-1000 ease-out transform
              ${isOpened ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
              ${isOpening ? 'animate-bounce' : 'hover:scale-105 cursor-pointer'}
            `}>
              <div className={`w-32 h-32 ${isEncouragement ? 'bg-orange-600' : 'bg-emerald-600'} rounded-2xl shadow-2xl flex items-center justify-center relative group`}>
                <Gift className="w-16 h-16 text-white" />
                <div className={`absolute -top-4 w-full flex justify-center`}>
                  <div className={`w-8 h-8 rounded-full ${isEncouragement ? 'bg-orange-400 border-orange-600' : 'bg-emerald-400 border-emerald-600'} border-4 shadow-inner`}></div>
                </div>
              </div>
            </div>

            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out
              ${isOpened ? 'scale-110 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-45'}
            `}>
              <div className={`w-40 h-40 rounded-full bg-gradient-to-tr ${isEncouragement ? 'from-orange-400 to-red-500' : 'from-yellow-400 to-orange-500'} shadow-2xl flex items-center justify-center border-8 border-white`}>
                <Icon className="w-20 h-20 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>

          <div className={`space-y-4 transition-all duration-700 delay-300
            ${isOpened ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
          `}>
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 ${isEncouragement ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'} rounded-full text-xs font-black uppercase tracking-wider mb-2`}>
              {isEncouragement ? <Flame className="w-3.5 h-3.5 fill-orange-500" /> : <Star className="w-3.5 h-3.5 fill-yellow-500" />}
              {isEncouragement ? 'Weekly Motivation' : `Progress Milestone: ${reward.metadata?.streak_milestone} Days`}
            </div>
            
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {reward.title}
            </h2>
            
            <p className="text-slate-500 text-lg leading-relaxed font-medium px-4">
              {reward.message}
            </p>

            <div className="pt-8 flex flex-col items-center gap-4">
              <Button 
                onClick={onClose}
                className={`w-full sm:w-auto px-10 h-14 ${isEncouragement ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'} text-white rounded-2xl shadow-xl font-bold transition-all text-lg group`}
              >
                {isEncouragement ? 'Accept Challenge' : 'Claim My Reward'}
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <p className="flex items-center gap-2 text-slate-400 text-sm font-semibold">
                <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                {isEncouragement ? 'Believe in yourself!' : 'Keep going, your health is our priority.'}
              </p>
            </div>
          </div>
        </div>

        {isOpened && (
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <Sparkles className={`absolute top-1/4 left-10 w-6 h-6 ${isEncouragement ? 'text-orange-500' : 'text-yellow-500'} animate-pulse`} />
            <Sparkles className={`absolute bottom-1/4 right-10 w-8 h-8 ${isEncouragement ? 'text-red-400' : 'text-emerald-400'} animate-pulse delay-700`} />
            <Sparkles className={`absolute top-1/3 right-20 w-5 h-5 ${isEncouragement ? 'text-yellow-400' : 'text-blue-400'} animate-pulse delay-300`} />
          </div>
        )}
      </div>
    </div>
  );
}
