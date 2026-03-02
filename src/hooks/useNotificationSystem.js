import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'

/**
 * useNotificationSystem
 * 
 * Manages daily health reminder notifications with Realtime synchronization.
 */
export const useNotificationSystem = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch today's notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      if (!user && !guestSessionId) return

      const today = new Date().toISOString().split('T')[0]

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('date', today)
        .order('created_at', { ascending: false })

      if (user) {
        query = query.eq('user_id', user.id)
      } else {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark a notification as read
  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  // Set up Realtime subscription
  useEffect(() => {
    let channel

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const guestSessionId = !user ? aiService.getChatSessionId() : null
      
      if (!user && !guestSessionId) return

      fetchNotifications()

      const filter = user 
        ? `user_id=eq.${user.id}` 
        : `guest_session_id=eq.${guestSessionId}`

      channel = supabase
        .channel(`public:notifications:guest_or_user`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: filter,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications(prev => [payload.new, ...prev])
              setUnreadCount(prev => prev + 1)
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev => 
                prev.map(n => n.id === payload.new.id ? payload.new : n)
              )
              if (payload.old.is_read === false && payload.new.is_read === true) {
                setUnreadCount(prev => Math.max(0, prev - 1))
              }
            }
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    refresh: fetchNotifications
  }
}
