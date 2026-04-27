import { supabase } from './supabase'

export const userService = {
  /**
   * Fetches the current auth user and their onboarding status from the 'users' table.
   * Strictly avoids context/global state by directly querying Supabase.
   */
  async getUserStatus() {
    let currentUser = null
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return { user: null, onboarding_complete: false }
      
      currentUser = user // Save the authenticated user

      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('onboarding_complete')
        .eq('id', user.id)
        .maybeSingle()

      // FALLBACK: If 'users' table is missing (42P01) or RLS is blocked (42501)
      const isBlocked = dbError && (dbError.code === '42P01' || dbError.code === '42501' || dbError.message?.includes('row-level security'))
      if (isBlocked) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        
        return { user: currentUser, onboarding_complete: !!profileData }
      }

      // Requirement 3: If user exists in auth but NOT in 'users' table, insert them
      if (!userData && !dbError) {
        const { data: newData, error: insertError } = await supabase
          .from('users')
          .insert({ 
            id: user.id, 
            email: user.email, 
            onboarding_complete: false 
          })
          .select('onboarding_complete')
          .single()
        
        if (insertError) {
          // Fallback during insert too for missing table or RLS
          const isInsertBlocked = insertError.code === '42P01' || insertError.code === '42501' || insertError.message?.includes('row-level security')
          if (isInsertBlocked) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle()
            return { user: currentUser, onboarding_complete: !!profileData }
          }
          throw insertError
        }
        return { user: currentUser, onboarding_complete: newData.onboarding_complete }
      }

      if (dbError) throw dbError

      return { user: currentUser, onboarding_complete: userData?.onboarding_complete ?? false }
    } catch (err) {
      console.error('[userService] Error checking status:', err.message)
      // Return the user if we have them, otherwise null
      return { user: currentUser, onboarding_complete: false }
    }
  },

  /**
   * Trigger Google OAuth login
   */
  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) console.error('[userService] Login error:', error.message)
  },

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[userService] Logout error:', error.message)
    window.location.href = '/auth'
  },

  /**
   * Update onboarding status to complete
   */
  async completeOnboarding() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No authenticated user')

    const { error } = await supabase
      .from('users')
      .upsert({ 
        id: user.id, 
        email: user.email,
        onboarding_complete: true, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'id' })

    if (error) {
      // If users table is missing, we don't strictly need to update it for the app to work now
      if (error.code === '42P01') {
        return true 
      }
      throw error
    }
    return true
  }
}
