import { supabase } from './supabase'

export const persistenceService = {
  /**
   * Fetch a persistent state from the database
   */
  getState: async (featureKey, userId = null, guestSessionId = null, profileId = null) => {
    try {
      let query = supabase
        .from('feature_persistence')
        .select('state_data')
        .eq('feature_key', featureKey)

      if (profileId) {
        query = query.eq('profile_id', profileId)
      } else if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      } else {
        return null
      }

      const { data, error } = await query.maybeSingle()
      if (error) throw error
      return data?.state_data || null
    } catch (error) {
      console.error(`[persistenceService] Error getting state for ${featureKey}:`, error)
      return null
    }
  },

  /**
   * Save a persistent state to the database
   */
  saveState: async (featureKey, stateData, userId = null, guestSessionId = null, profileId = null) => {
    try {
      const payload = {
        feature_key: featureKey,
        state_data: stateData,
        profile_id: profileId || null,
        updated_at: new Date().toISOString()
      }

      if (userId) {
        payload.user_id = userId
      } else if (guestSessionId) {
        payload.guest_session_id = guestSessionId
      }

      const { error } = await supabase
        .from('feature_persistence')
        .upsert(payload, { 
          onConflict: profileId ? 'profile_id,feature_key' : (userId ? 'user_id,feature_key' : 'guest_session_id,feature_key') 
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error(`[persistenceService] Error saving state for ${featureKey}:`, error)
      return false
    }
  },

  /**
   * Remove a persistent state from the database
   */
  removeState: async (featureKey, userId = null, guestSessionId = null, profileId = null) => {
    try {
      let query = supabase
        .from('feature_persistence')
        .delete()
        .eq('feature_key', featureKey)

      if (profileId) {
        query = query.eq('profile_id', profileId)
      } else if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      } else {
        return false
      }

      const { error } = await query
      if (error) throw error
      return true
    } catch (error) {
      console.error(`[persistenceService] Error removing state for ${featureKey}:`, error)
      return false
    }
  }
}
