// src/hooks/useNotifications.js
// Centralised notification hook: fetches notifications, subscribes
// to realtime inserts, and exposes mark-as-read helpers.

import { useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'

// ─── Supabase helpers ────────────────────────────────────────

async function fetchNotifications(userId, guestSessionId, limit = 50) {
  if (!userId && !guestSessionId) return []
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (userId) {
    query = query.eq('user_id', userId)
  } else {
    query = query.eq('guest_session_id', guestSessionId)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function updateNotificationRead(id) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

async function updateAllNotificationsRead(userId, guestSessionId) {
  if (!userId && !guestSessionId) return
  let query = supabase
    .from('notifications')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('is_read', false)

  if (userId) {
    query = query.eq('user_id', userId)
  } else {
    query = query.eq('guest_session_id', guestSessionId)
  }

  const { error } = await query
  if (error) throw error
}

// ─── Hook ────────────────────────────────────────────────────

/**
 * useNotifications
 *
 * @param {string|null} userId  - Authenticated user ID (null = inactive)
 * @param {number}      limit   - Max notifications to fetch (default 50)
 *
 * @returns {{
 *   notifications: object[],
 *   unreadCount: number,
 *   isLoading: boolean,
 *   isError: boolean,
 *   markAsRead: (id: string) => void,
 *   markAllAsRead: () => void,
 *   refetch: () => void
 * }}
 */
export function useNotifications(userId, limit = 50) {
  const queryClient = useQueryClient()
  const channelRef  = useRef(null)
  const guestSessionId = !userId ? aiService.getChatSessionId() : null

  // ── Primary query ───────────────────────────────────────────
  const {
    data: notifications = [],
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey:    ['notifications', userId, guestSessionId],
    queryFn:     () => fetchNotifications(userId, guestSessionId, limit),
    enabled:     !!(userId || guestSessionId),
    staleTime:   30_000,      // 30 s — realtime keeps it fresher
    refetchOnWindowFocus: false
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // ── Realtime subscription ───────────────────────────────────
  useEffect(() => {
    if (!userId && !guestSessionId) return

    // Teardown previous channel if userId changed
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const filter = userId 
      ? `user_id=eq.${userId}` 
      : `guest_session_id=eq.${guestSessionId}`

    const channel = supabase
      .channel(`notifications_realtime_${userId || guestSessionId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',               // INSERT | UPDATE | DELETE
          schema: 'public',
          table:  'notifications',
          filter: filter
        },
        (payload) => {
          queryClient.setQueryData(['notifications', userId, guestSessionId], (old = []) => {
            switch (payload.eventType) {
              case 'INSERT':
                if (old.some((n) => n.id === payload.new.id)) return old
                
                // --- Trigger Audio & Web Push Alert ---
                try {
                  // Play pleasant chime
                  const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg') 
                  audio.volume = 0.5
                  audio.play().catch(e => console.log('Audio autoplay prevented:', e))

                  // Trigger Web Push Notification if permitted
                  if (Notification.permission === 'granted') {
                    new Notification(payload.new.title || 'New Notification', {
                      body: payload.new.message || 'You have a new update in Health Tracker',
                      icon: '/favicon.ico' // Or any app icon path you use
                    })
                  }
                } catch (err) {
                  console.error('Failed to play notification alert:', err)
                }

                return [payload.new, ...old]
              case 'UPDATE':
                return old.map((n) => (n.id === payload.new.id ? payload.new : n))
              case 'DELETE':
                return old.filter((n) => n.id !== payload.old.id)
              default:
                return old
            }
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, guestSessionId, queryClient])

  // ── Mark single as read ─────────────────────────────────────
  const markAsReadMutation = useMutation({
    mutationFn: updateNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', userId, guestSessionId] })
      const previous = queryClient.getQueryData(['notifications', userId, guestSessionId])
      queryClient.setQueryData(['notifications', userId, guestSessionId], (old = []) =>
        old.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['notifications', userId, guestSessionId], ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId, guestSessionId] })
    }
  })

  // ── Mark all as read ────────────────────────────────────────
  const markAllAsReadMutation = useMutation({
    mutationFn: () => updateAllNotificationsRead(userId, guestSessionId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', userId, guestSessionId] })
      const previous = queryClient.getQueryData(['notifications', userId, guestSessionId])
      queryClient.setQueryData(['notifications', userId, guestSessionId], (old = []) =>
        old.map((n) => ({ ...n, is_read: true }))
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['notifications', userId, guestSessionId], ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId, guestSessionId] })
    }
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    isError,
    markAsRead:    useCallback((id) => markAsReadMutation.mutate(id),      [markAsReadMutation]),
    markAllAsRead: useCallback(() => markAllAsReadMutation.mutate(),        [markAllAsReadMutation]),
    refetch
  }
}
