import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { aiService } from '../../services/aiService';
import { Loader2, Activity, Heart, Thermometer, User, Scale, Ruler, MessageSquare } from 'lucide-react';

const HealthCheckinForm = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    weight: '',
    height: '',
    systolic_bp: '',
    diastolic_bp: '',
    pulse_rate: '',
    blood_sugar: '',
    thyroid_status: 'normal',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await aiService.analyzeHealthCheckin(formData);
      if (onComplete) onComplete(data);
    } catch (err) {
      console.error('Error submitting check-in:', err);
      alert('Failed to complete check-in: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-slate-800">New Health Check-in</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weight & Height */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Scale className="w-4 h-4" /> Weight (kg)
          </label>
          <input
            type="number"
            name="weight"
            required
            step="0.1"
            value={formData.weight}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="70.5"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Ruler className="w-4 h-4" /> Height (cm)
          </label>
          <input
            type="number"
            name="height"
            required
            value={formData.height}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="175"
          />
        </div>

        {/* BP */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Heart className="w-4 h-4 text-red-500" /> Systolic BP
          </label>
          <input
            type="number"
            name="systolic_bp"
            required
            value={formData.systolic_bp}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
            placeholder="120"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Heart className="w-4 h-4 text-red-400" /> Diastolic BP
          </label>
          <input
            type="number"
            name="diastolic_bp"
            required
            value={formData.diastolic_bp}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-400 outline-none transition-all"
            placeholder="80"
          />
        </div>

        {/* Pulse & Sugar */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Activity className="w-4 h-4 text-orange-500" /> Pulse Rate
          </label>
          <input
            type="number"
            name="pulse_rate"
            required
            value={formData.pulse_rate}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            placeholder="72"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Thermometer className="w-4 h-4 text-purple-500" /> Blood Sugar
          </label>
          <input
            type="number"
            name="blood_sugar"
            required
            value={formData.blood_sugar}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            placeholder="95"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <User className="w-4 h-4 text-teal-500" /> Thyroid Status
          </label>
          <select
            name="thyroid_status"
            value={formData.thyroid_status}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all bg-white"
          >
            <option value="normal">Normal</option>
            <option value="hypo">Hypothyroidism</option>
            <option value="hyper">Hyperthyroidism</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <MessageSquare className="w-4 h-4" /> Additional Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
          placeholder="Feelings, specific concerns..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] ${
          loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing with AI...
          </div>
        ) : (
          'Complete Check-in'
        )}
      </button>
    </form>
  );
};

export default HealthCheckinForm;
