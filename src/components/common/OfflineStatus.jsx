import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';

export default function OfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowOnlineToast(true);
      setTimeout(() => setShowOnlineToast(false), 5000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowOnlineToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] animate-in fade-in slide-in-from-top duration-500">
        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg border-b border-red-500/30 backdrop-blur-md">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <WifiOff className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <p className="text-sm font-black tracking-tight uppercase">You are currently offline</p>
            <p className="text-xs text-red-100 font-medium">Please check your internet connection to continue tracking your health.</p>
          </div>
        </div>
      </div>
    );
  }

  if (showOnlineToast) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top zoom-in duration-500">
        <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl flex items-center gap-4 shadow-2xl shadow-emerald-200 border border-emerald-500/30 backdrop-blur-md">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight uppercase">Back Online</p>
            <p className="text-xs text-emerald-100 font-medium">Your connection has been restored successfully.</p>
          </div>
          <button 
            onClick={() => setShowOnlineToast(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-2"
          >
            <X className="w-4 h-4 text-white/70 hover:text-white" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
