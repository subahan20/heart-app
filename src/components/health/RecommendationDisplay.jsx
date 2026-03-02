import React from 'react';
import { Shield, Coffee, Utensils, Apple, Moon, Footprints, Dumbbell, Zap, AlertCircle } from 'lucide-react';

const RecommendationDisplay = ({ recommendation }) => {
  if (!recommendation) return null;

  const { risk_level, diet_plan, exercise_plan, health_advice } = recommendation;

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getIntensityBadge = (intensity) => {
    switch (intensity?.toLowerCase()) {
      case 'low': return 'bg-blue-100 text-blue-700';
      case 'moderate': return 'bg-orange-100 text-orange-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      {/* Header & Risk Level */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${getRiskColor(risk_level)}`}>
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <div>
            <p className="text-xs uppercase tracking-wider font-bold opacity-70">AI Health Assessment</p>
            <h3 className="text-lg font-bold">Risk Level: {risk_level || 'N/A'}</h3>
          </div>
        </div>
        <AlertCircle className="w-5 h-5 opacity-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diet Plan */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <Utensils className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">Personalized Diet Plan</h3>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <Coffee className="w-5 h-5 text-orange-500" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-700">Breakfast</p>
                <p className="text-sm text-slate-600 leading-relaxed">{diet_plan?.breakfast}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Utensils className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-700">Lunch</p>
                <p className="text-sm text-slate-600 leading-relaxed">{diet_plan?.lunch}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
                <Apple className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-700">Snacks</p>
                <p className="text-sm text-slate-600 leading-relaxed">{diet_plan?.snacks}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-700">Dinner</p>
                <p className="text-sm text-slate-600 leading-relaxed">{diet_plan?.dinner}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Exercise Plan */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <Dumbbell className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">Exercise Strategy</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl text-center">
              <Footprints className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Daily Target</p>
              <p className="font-bold text-slate-800 text-lg">{exercise_plan?.daily_km} km</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl text-center">
              <Zap className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Intensity</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase inline-block mt-1 ${getIntensityBadge(exercise_plan?.intensity)}`}>
                {exercise_plan?.intensity}
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Cardio Suggestions</p>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {exercise_plan?.cardio}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Strength Training</p>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {exercise_plan?.strength}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Advice */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl text-white shadow-xl">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" /> AI Health Advice
        </h3>
        <p className="text-slate-300 leading-relaxed italic text-lg">
          "{health_advice}"
        </p>
      </div>
    </div>
  );
};

export default RecommendationDisplay;
