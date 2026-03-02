import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'
import { toast } from 'react-toastify'

// ── Default settings per section ─────────────────────────────────────────────
export const SECTION_DEFAULTS = {
  diet: {
    section: 'diet',
    is_enabled: true,
    repeat_type: 'daily',
    custom_days: [],
    start_time: '18:00',
    end_time: '19:00',
    specific_times: ['09:00', '13:00', '16:00', '20:00'],
    frequency_minutes: null,
    timezone: 'Asia/Kolkata',
  },
  exercise: {
    section: 'exercise',
    is_enabled: true,
    repeat_type: 'daily',
    custom_days: [],
    start_time: '18:30',
    end_time: '19:30',
    specific_times: [],
    frequency_minutes: null,
    timezone: 'Asia/Kolkata',
  },
  water: {
    section: 'water',
    is_enabled: true,
    repeat_type: 'daily',
    custom_days: [],
    start_time: '06:00',
    end_time: '22:00',
    specific_times: [],
    frequency_minutes: 120,
    timezone: 'Asia/Kolkata',
  },
  mental: {
    section: 'mental',
    is_enabled: true,
    repeat_type: 'daily',
    custom_days: [],
    start_time: '20:00',
    end_time: '20:00',
    specific_times: [],
    frequency_minutes: null,
    timezone: 'Asia/Kolkata',
  },
  sleep: {
    section: 'sleep',
    is_enabled: true,
    repeat_type: 'daily',
    custom_days: [],
    start_time: '22:00',
    end_time: '22:00',
    specific_times: [],
    frequency_minutes: null,
    timezone: 'Asia/Kolkata',
  },
}

const SECTIONS = ['diet', 'exercise', 'water', 'mental', 'sleep']

export function useReminderSettings() {
  const [settings, setSettings] = useState(
    Object.fromEntries(SECTIONS.map(s => [s, { ...SECTION_DEFAULTS[s] }]))
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // ── Fetch from DB ───────────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId         = user?.id ?? null
      const guestSessionId = !user ? aiService.getChatSessionId() : null

      let query = supabase
        .from('user_reminder_settings')
        .select('*')

      if (userId) {
        query = query.eq('user_id', userId)
      } else {
        query = query.eq('guest_session_id', guestSessionId).is('user_id', null)
      }

      const { data, error } = await query
      if (error && error.code !== '42703') throw error

      // Merge DB rows over defaults
      const merged = { ...Object.fromEntries(SECTIONS.map(s => [s, { ...SECTION_DEFAULTS[s] }])) }
      if (data) {
        data.forEach(row => {
          if (merged[row.section]) {
            merged[row.section] = {
              ...merged[row.section],
              ...row,
              // Normalise postgres time arrays to strings
              specific_times: row.specific_times ?? [],
              custom_days:    row.custom_days    ?? [],
            }
          }
        })
      }
      setSettings(merged)
    } catch (err) {
      console.error('[useReminderSettings] fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  // ── Update a single section field ──────────────────────────────────────────
  const updateSection = useCallback((section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }))
  }, [])

  // ── Save all to DB ─────────────────────────────────────────────────────────
  const saveAll = useCallback(async () => {
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId         = user?.id ?? null
      const guestSessionId = !user ? aiService.getChatSessionId() : null

      const rows = SECTIONS.map(section => {
        const s = settings[section]
        return {
          user_id:           userId,
          guest_session_id:  guestSessionId,
          section,
          is_enabled:        s.is_enabled,
          repeat_type:       s.repeat_type,
          custom_days:       s.custom_days?.length ? s.custom_days : null,
          start_time:        s.start_time || null,
          end_time:          s.end_time   || null,
          specific_times:    s.specific_times?.length ? s.specific_times : null,
          frequency_minutes: s.frequency_minutes || null,
          timezone:          s.timezone || 'Asia/Kolkata',
        }
      })

      // Insert/update each row individually to avoid NULL constraint issues
      for (const row of rows) {
        // Check if row exists
        let checkQ = supabase
          .from('user_reminder_settings')
          .select('id')
          .eq('section', row.section)

        if (userId) {
          checkQ = checkQ.eq('user_id', userId)
        } else {
          checkQ = checkQ.eq('guest_session_id', guestSessionId).is('user_id', null)
        }

        const { data: existing } = await checkQ.maybeSingle()

        if (existing?.id) {
          const { error } = await supabase
            .from('user_reminder_settings')
            .update(row)
            .eq('id', existing.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('user_reminder_settings')
            .insert(row)
          if (error) throw error
        }
      }

      toast.success('Reminder settings saved successfully 🔔')
    } catch (err) {
      console.error('[useReminderSettings] save error:', err)
      toast.error('Failed to save reminder settings')
    } finally {
      setIsSaving(false)
    }
  }, [settings])

  return { settings, isLoading, isSaving, updateSection, saveAll, refetch: fetchSettings }
}
