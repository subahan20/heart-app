import { supabase } from './supabase'

export class SupabaseNotificationService {
  constructor() {
    this.subscriptions = new Map()
  }

  // Create a new notification
  async createNotification(userId, guestSessionId, category, type, title, message, metadata = {}) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const notificationData = {
        category,
        type,
        title,
        message,
        date: today,
        is_read: false,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString()
        }
      }

      // Always include both user_id and guest_session_id for index matching
      notificationData.user_id = userId || null
      notificationData.guest_session_id = guestSessionId || null

      // Use the standardized composite conflict target matching idx_notifications_unified_upsert
      const onConflict = 'user_id,guest_session_id,date,category,type'

      const { data, error } = await supabase
        .from('notifications')
        .upsert(notificationData, { 
          onConflict,
          ignoreDuplicates: true 
        })
        .select()
        .maybeSingle()  // ignoreDuplicates returns 0 rows — maybeSingle() handles that safely

      if (error) {
        if (error.code === '23505') {
          console.warn('Notification duplicate skipped:', { category, type, date: today })
          return { success: true, duplicated: true }
        }
        console.error('Error creating notification:', error)
        throw error
      }

      // data is null when the row already existed and was skipped (ignoreDuplicates)
      if (!data) {
        return { success: true, duplicated: true }
      }

      return data
    } catch (error) {
      console.error('Failed to create notification:', error)
      throw error
    }
  }

  // Get notifications for a user
  async getNotifications(userId, guestSessionId, limit = 50, unreadOnly = false) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter by user or guest
      if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      // Filter by read status if requested
      if (unreadOnly) {
        query = query.eq('is_read', false)
      }

      // Apply limit
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

      if (!data) {
        console.warn('Notification not found or already read:', notificationId)
        return null
      }

      console.log('✅ Notification marked as read:', data)
      return data
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId, guestSessionId) {
    try {
      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false)

      if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error marking all notifications as read:', error)
        throw error
      }

      console.log('✅ All notifications marked as read:', data)
      return data
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      throw error
    }
  }

  // Get unread count
  async getUnreadCount(userId, guestSessionId) {
    try {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

      if (userId) {
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

  // Delete old notifications (cleanup)
  async deleteOldNotifications(userId, guestSessionId, daysToKeep = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString()

      let query = supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate)

      if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error deleting old notifications:', error)
        throw error
      }

      console.log(`✅ Deleted old notifications older than ${daysToKeep} days:`, data)
      return data
    } catch (error) {
      console.error('Failed to delete old notifications:', error)
      throw error
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(userId, guestSessionId, callback) {
    try {
      const subscriptionKey = userId || guestSessionId || 'anonymous'
      
      // Unsubscribe from existing subscription
      if (this.subscriptions.has(subscriptionKey)) {
        this.subscriptions.get(subscriptionKey).unsubscribe()
      }

      const subscription = supabase
        .channel(`notifications_${subscriptionKey}`)
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: userId 
              ? `user_id=eq.${userId}`
              : guestSessionId
              ? `guest_session_id=eq.${guestSessionId}`
              : undefined
          },
          (payload) => {
            console.log('🔔 Real-time notification update:', payload)
            callback(payload)
          }
        )
        .subscribe()

      this.subscriptions.set(subscriptionKey, subscription)
      console.log(`✅ Subscribed to notifications for: ${subscriptionKey}`)
      
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error)
      throw error
    }
  }

  // Unsubscribe from notifications
  unsubscribeFromNotifications(userId, guestSessionId) {
    try {
      const subscriptionKey = userId || guestSessionId || 'anonymous'
      
      if (this.subscriptions.has(subscriptionKey)) {
        const subscription = this.subscriptions.get(subscriptionKey)
        subscription.unsubscribe()
        this.subscriptions.delete(subscriptionKey)
        console.log(`✅ Unsubscribed from notifications for: ${subscriptionKey}`)
      }
    } catch (error) {
      console.error('Failed to unsubscribe from notifications:', error)
    }
  }

  // Get notifications by category
  async getNotificationsByCategory(userId, guestSessionId, category, limit = 10) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting notifications by category:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to get notifications by category:', error)
      return []
    }
  }

  // Get notifications by type
  async getNotificationsByType(userId, guestSessionId, type, limit = 10) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting notifications by type:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to get notifications by type:', error)
      return []
    }
  }

  // Get today's notifications
  async getTodayNotifications(userId, guestSessionId) {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('notifications')
        .select('*')
        .gte('created_at', today)
        .order('created_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      } else if (guestSessionId) {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting today\'s notifications:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to get today\'s notifications:', error)
      return []
    }
  }

  // Cleanup all subscriptions
  cleanup() {
    try {
      for (const [key, subscription] of this.subscriptions) {
        subscription.unsubscribe()
        console.log(`✅ Cleaned up subscription: ${key}`)
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
