import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <h1 className="text-[12rem] font-black tracking-tighter text-emerald-900 select-none">404</h1>
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-emerald-100 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-100 transform rotate-12 transition-transform hover:rotate-0 duration-500">
              <Search className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Page Not Found</h2>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              We couldn't find the page you're looking for. <br />
              It might have been moved or deleted.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-3 border-2 border-slate-200 hover:border-emerald-200 h-14 rounded-2xl font-bold text-slate-600 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-emerald-600 text-white h-14 rounded-2xl shadow-xl shadow-slate-200 font-bold transition-all transform hover:-translate-y-1"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Button>
        </div>

        <div className="pt-8 flex flex-col items-center gap-4">
          <div className="w-12 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
          <p className="text-slate-400 text-sm font-medium">
            Need help? Contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
