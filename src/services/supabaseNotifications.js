import { supabase } from './supabase'

export class SupabaseNotificationService {
  constructor() {
    this.subscriptions = new Map()
  }

  // Create a new notification
  async createNotification(userId, guestSessionId, category, type, title, message, metadata = {}, profileId = null) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const notificationData = {
        category,
        type,
        title,
        message,
        date: today,
        is_read: false,
        profile_id: profileId || null,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString()
        }
      }

      // Always include both user_id and guest_session_id for index matching
      notificationData.user_id = userId || null
      notificationData.guest_session_id = guestSessionId || null

      // Use the standardized composite conflict target
      const onConflict = 'user_id,guest_session_id,profile_id,date,category,type'

      const { data, error } = await supabase
        .from('notifications')
        .upsert(notificationData, { 
          onConflict,
          ignoreDuplicates: true 
        })
        .select()
        .maybeSingle()

      if (error) {
        if (error.code === '23505') {
          console.warn('Notification duplicate skipped:', { category, type, date: today })
          return { success: true, duplicated: true }
        }
        console.error('Error creating notification:', error)
        throw error
      }

      if (!data) {
        return { success: true, duplicated: true }
      }

      return data
    } catch (error) {
      console.error('Failed to create notification:', error)
      throw error
    }
  }

  // Get notifications for a profile
  async getNotifications(userId, guestSessionId, limit = 50, unreadOnly = false, profileId = null) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      // Isolate by user/guest AND profile_id if available
      if (profileId) {
        query = query.eq('profile_id', profileId)
      } else if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      if (unreadOnly) {
        query = query.eq('is_read', false)
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching notifications:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to get notifications:', error)
      return []
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()
        .maybeSingle()

      if (error) {
        console.error('Error marking notification as read:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read for a profile
  async markAllAsRead(userId, guestSessionId, profileId = null) {
    try {
      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false)

      if (profileId) {
        query = query.eq('profile_id', profileId)
      } else if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error marking all notifications as read:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      throw error
    }
  }

  // Get unread count
  async getUnreadCount(userId, guestSessionId, profileId = null) {
    try {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

      if (profileId) {
        query = query.eq('profile_id', profileId)
      } else if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { count, error } = await query

      if (error) {
        console.error('Error getting unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Failed to get unread count:', error)
      return 0
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(userId, guestSessionId, profileId, callback) {
    try {
      const subscriptionKey = profileId || userId || guestSessionId || 'anonymous'
      
      if (this.subscriptions.has(subscriptionKey)) {
        this.subscriptions.get(subscriptionKey).unsubscribe()
      }

      const filter = profileId 
        ? `profile_id=eq.${profileId}`
        : userId
        ? `user_id=eq.${userId}`
        : guestSessionId
        ? `guest_session_id=eq.${guestSessionId}`
        : undefined

      const subscription = supabase
        .channel(`notifications_${subscriptionKey}`)
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter
          },
          (payload) => {
            console.log('🔔 Real-time notification update:', payload)
            callback(payload)
          }
        )
        .subscribe()

      this.subscriptions.set(subscriptionKey, subscription)
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error)
      throw error
    }
  }

  // Unsubscribe from notifications
  unsubscribeFromNotifications(userId, guestSessionId, profileId = null) {
    try {
      const subscriptionKey = profileId || userId || guestSessionId || 'anonymous'
      
      if (this.subscriptions.has(subscriptionKey)) {
        const subscription = this.subscriptions.get(subscriptionKey)
        subscription.unsubscribe()
        this.subscriptions.delete(subscriptionKey)
      }
    } catch (error) {
      console.error('Failed to unsubscribe from notifications:', error)
    }
  }

  // Cleanup all subscriptions
  cleanup() {
    try {
      for (const [key, subscription] of this.subscriptions) {
        subscription.unsubscribe()
      }
      this.subscriptions.clear()
    } catch (error) {
      console.error('Failed to cleanup subscriptions:', error)
    }
  }
}

// Create singleton instance
export const supabaseNotificationService = new SupabaseNotificationService()
export default supabaseNotificationService
