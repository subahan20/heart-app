import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'

/**
 * useHealthProfile
 * 
 * MINIMALIST ARCHITECTURE (NO CONTEXT)
 * 
 * - Source of truth: localStorage.getItem("activeProfileId")
 * - Switching: localStorage.setItem(...) + window.location.reload()
 */
export function useHealthProfile() {
  const [activeProfile, setActiveProfile] = useState(null)
  const [allProfiles,    setAllProfiles]    = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)

  const activeProfileId = localStorage.getItem('activeProfileId')

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      const guestId = aiService.getChatSessionId()

      let profilesList = []

      if (user) {
        // 1. Adopt any orphaned guest profiles first
        if (guestId) {
          await supabase
            .from('profiles')
            .update({ user_id: user.id })
            .eq('guest_session_id', guestId)
            .is('user_id', null)
        }

        // 2. Fetch all profiles for this user
        const { data, error: fetchErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
        
        if (fetchErr) throw fetchErr
        profilesList = data || []
      } else if (guestId) {
        // 3. Fetch for guest
        const { data, error: guestErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('guest_session_id', guestId)
          .is('user_id', null)
          .order('created_at', { ascending: true })

        if (guestErr) throw guestErr
        profilesList = data || []
      }

      setAllProfiles(profilesList)

      // Resolve active profile object from ID
      if (activeProfileId) {
        const active = profilesList.find(p => String(p.id) === String(activeProfileId))
        if (active) {
          setActiveProfile(active)
        } else if (profilesList.length > 0) {
          // Fallback if current active profile is missing (e.g. deleted)
          setActiveProfile(profilesList[0])
          localStorage.setItem('activeProfileId', profilesList[0].id)
        }
      } else if (profilesList.length > 0) {
        // Auto-select first profile if none active
        setActiveProfile(profilesList[0])
        localStorage.setItem('activeProfileId', profilesList[0].id)
      }
    } catch (err) {
      console.error('[useHealthProfile] Error:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [activeProfileId])

  useEffect(() => {
    fetchProfiles()

    // Sync across instances (Gate, Home, etc.)
    const handleSync = () => fetchProfiles()
    window.addEventListener('profile-updated', handleSync)
    
    // Listen for storage changes from other tabs
    const handleStorage = (e) => {
      if (e.key === 'activeProfileId') fetchProfiles()
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('profile-updated', handleSync)
      window.removeEventListener('storage', handleStorage)
    }
  }, [fetchProfiles])

  const switchProfile = (id, redirectTo = null) => {
    if (!id) return
    localStorage.setItem('activeProfileId', id)
    
    // Use hard reload to ensure all TanStack Query caches and states are completely cleared
    // This is the safest way to guarantee data isolation between profiles.
    if (redirectTo) {
      window.location.href = redirectTo
    } else {
      window.location.reload()
    }
  }

  const createProfile = async (name) => {
    const { data: { user } } = await supabase.auth.getUser()
    const guestId = aiService.getChatSessionId()

    const { data, error: insErr } = await supabase
      .from('profiles')
      .insert({ 
        user_id: user?.id || null, 
        guest_session_id: guestId,
        name,
        onboarding_complete: false 
      })
      .select()
      .single()

    if (insErr) throw insErr
    await fetchProfiles()
    window.dispatchEvent(new Event('profile-updated'))
    return data
  }

  const updateProfile = async (id, updates, isAddMode = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const guestId = aiService.getChatSessionId()
      
      let result
      if (isAddMode) {
        // Creating a new profile with full details
        const { data, error: insErr } = await supabase
          .from('profiles')
          .insert({
            ...updates,
            user_id: user?.id || null,
            guest_session_id: guestId,
            onboarding_complete: true
          })
          .select()
          .single()
        if (insErr) throw insErr
        result = data
        // Switch to the newly created profile
        localStorage.setItem('activeProfileId', data.id)
      } else {
        // Updating existing profile
        const { data, error: updErr } = await supabase
          .from('profiles')
          .update({
            ...updates,
            onboarding_complete: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()
        if (updErr) throw updErr
        result = data
      }
      
      await fetchProfiles()
      window.dispatchEvent(new Event('profile-updated'))
      return result
    } catch (err) {
      console.error('[useHealthProfile] Update failed:', err)
      throw err
    }
  }

  return {
    activeProfile,
    profile: activeProfile, // Alias for backward compatibility
    allProfiles,
    activeProfileId,
    switchProfile,
    createProfile,
    updateProfile,
    loading,
    error,
    refresh: fetchProfiles
  }
}
