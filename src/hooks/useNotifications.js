import { useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { aiService } from '../services/aiService'

// ─── Supabase helpers ────────────────────────────────────────

async function fetchNotifications(userId, guestSessionId, profileId, limit = 50) {
  if (!userId && !guestSessionId) return []
  
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  // Minimalist Filtering: Always use profile_id if available
  if (profileId) {
    query = query.eq('profile_id', profileId)
  } else if (userId) {
    query = query.eq('user_id', userId)
  } else if (guestSessionId) {
    query = query.eq('guest_session_id', guestSessionId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function updateNotificationRead(id) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

async function updateAllNotificationsRead(userId, guestSessionId, profileId) {
  if (!userId && !guestSessionId) return
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

  const { error } = await query
  if (error) throw error
}

// ─── Hook ────────────────────────────────────────────────────

export function useNotifications(userId, limit = 50) {
  const queryClient = useQueryClient()
  const channelRef  = useRef(null)
  const guestSessionId = !userId ? aiService.getChatSessionId() : null
  
  // MINIMALIST: Read directly from localStorage
  const profileId = localStorage.getItem('activeProfileId')

  // ── Primary query ───────────────────────────────────────────
  const {
    data: notifications = [],
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey:    ['notifications', userId, guestSessionId, profileId],
    queryFn:     () => fetchNotifications(userId, guestSessionId, profileId, limit),
    enabled:     !!(userId || guestSessionId),
    staleTime:   30_000,      
    refetchInterval: 10_000,  
    refetchIntervalInBackground: true, 
    refetchOnWindowFocus: false
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // ── Realtime subscription ───────────────────────────────────
  useEffect(() => {
    const subKey = profileId || userId || guestSessionId
    if (!subKey) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const filter = profileId 
      ? `profile_id=eq.${profileId}`
      : userId 
      ? `user_id=eq.${userId}`
      : `guest_session_id=eq.${guestSessionId}`

    const channel = supabase
      .channel(`notifications_realtime_${subKey}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter
        },
        (payload) => {
          queryClient.setQueryData(['notifications', userId, guestSessionId, profileId], (old = []) => {
            try {
              const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg') 
              audio.volume = 0.5
              audio.play().catch(e => console.log('Audio autoplay prevented:', e))

              if (Notification.permission === 'granted') {
                new Notification('Health Tracker', {
                  body: payload.new.message || 'New update available',
                  icon: '/favicon.ico'
                })
              }
            } catch (err) {
              console.error('Failed to play notification alert:', err)
            }

            return [payload.new, ...old]
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        // Only remove if not already closed
        supabase.removeChannel(channelRef.current).catch(() => {})
        channelRef.current = null
      }
    }
  }, [userId, guestSessionId, profileId, queryClient])

  // ── Mutations ───────────────────────────────────────────────
  const markAsReadMutation = useMutation({
    mutationFn: updateNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', userId, guestSessionId, profileId] })
      const previous = queryClient.getQueryData(['notifications', userId, guestSessionId, profileId])
      queryClient.setQueryData(['notifications', userId, guestSessionId, profileId], (old = []) =>
        old.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['notifications', userId, guestSessionId, profileId], ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId, guestSessionId, profileId] })
    }
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => updateAllNotificationsRead(userId, guestSessionId, profileId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', userId, guestSessionId, profileId] })
      const previous = queryClient.getQueryData(['notifications', userId, guestSessionId, profileId])
      queryClient.setQueryData(['notifications', userId, guestSessionId, profileId], (old = []) =>
        old.map((n) => ({ ...n, is_read: true }))
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['notifications', userId, guestSessionId, profileId], ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId, guestSessionId, profileId] })
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
