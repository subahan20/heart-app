import React, { useState, useEffect } from 'react'
import { Phone, User, Calendar, MessageSquare, Info, Send, Loader2 } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { supabase } from '../../services/supabase'
import { aiService } from '../../services/aiService'

export default function BookCallModal({ onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    regarding: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = aiService.getChatSessionId()

      const submissionData = {
        ...formData,
        user_id: user?.id || null,
        guest_session_id: !user ? guestSessionId : null,
        age: formData.age ? parseInt(formData.age) : null
      }

      const { error: submitError } = await supabase
        .from('consultation_requests')
        .insert([submissionData])

      if (submitError) throw submitError

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 3000)
    } catch (err) {
      console.error('Error submitting consultation request:', err)
      setError(err.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="py-12 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <Send className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-slate-800">Request Sent!</h3>
        <p className="text-slate-600">
          Thank you for reaching out. We'll be in touch with you shortly on the provided phone number.
        </p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-2">
      <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 text-blue-700 mb-2">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Book a priority consultation with our health experts. Please fill in your details below and we will call you.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
            <User className="w-4 h-4" /> Full Name
          </label>
          <Input 
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. John Doe"
            required
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Age
            </label>
            <Input 
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="e.g. 25"
              required
              min="1"
              max="120"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Phone Number
            </label>
            <Input 
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +1 234 567 890"
              required
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
            <Info className="w-4 h-4" /> Regarding
          </label>
          <Input 
            name="regarding"
            value={formData.regarding}
            onChange={handleChange}
            placeholder="e.g. Diet Plan, Heart Health"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Message (Optional)
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Tell us more about your requirement..."
            className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100">
          {error}
        </div>
      )}

      <div className="pt-2">
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Phone className="w-5 h-5" />
              Request a Call
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
