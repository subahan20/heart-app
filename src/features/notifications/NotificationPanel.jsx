// src/components/NotificationPanel.jsx
// Color-coded notification panel with bell badge, realtime updates,
// and mark-as-read functionality.

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../services/supabase'
import { useNotifications } from '../../hooks/useNotifications'
import { useSectionCompletion } from '../../hooks/useSectionCompletion'
import { useHealthProfile } from '../../hooks/useHealthProfile'

// ─── Helpers ─────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)   return 'Just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  return `${days}d ago`
}

// Color scheme per notification type
function getCardStyle(type) {
  switch (type) {
    case 'congratulations':
    case 'daily_success':
    case 'success':
      return {
        border:     '#22c55e',
        bg:         '#f0fdf4',
        iconBg:     '#dcfce7',
        icon:       '🎉',
        badge:      '#22c55e',
        badgeText:  '#ffffff'
      }
    case 'warning':
    case 'daily_warning':
      return {
        border:     '#f59e0b',
        bg:         '#fffbeb',
        iconBg:     '#fef3c7',
        icon:       '⚠️',
        badge:      '#f59e0b',
        badgeText:  '#ffffff'
      }
    case 'alert':
      return {
        border:     '#ef4444',
        bg:         '#fef2f2',
        iconBg:     '#fee2e2',
        icon:       '🚨',
        badge:      '#ef4444',
        badgeText:  '#ffffff'
      }
    case 'reminder':
      return {
        border:     '#10b981',
        bg:         '#f0fdf4',
        iconBg:     '#dcfce7',
        icon:       '💡',
        badge:      '#10b981',
        badgeText:  '#ffffff'
      }
    case 'achievement':
      return {
        border:     '#8b5cf6',
        bg:         '#f5f3ff',
        iconBg:     '#ede9fe',
        icon:       '🏆',
        badge:      '#8b5cf6',
        badgeText:  '#ffffff'
      }
    default:
      return {
        border:     '#6b7280',
        bg:         '#f9fafb',
        iconBg:     '#f3f4f6',
        icon:       '🔔',
        badge:      '#6b7280',
        badgeText:  '#ffffff'
      }
  }
}

// ─── Notification Card ───────────────────────────────────────

function NotificationCard({ notification, onMarkAsRead }) {
  const msg = notification.message?.toLowerCase() || ''
  
  // Logic: 
  // 1. Critical (red)
  // 2. Warning (yellow)
  // 3. Success (green) - default for "completed"
  let type = 'reminder' // fallback/neutral green
  if (msg.includes('critical') || msg.includes('urgent') || msg.includes('alert')) {
    type = 'alert' // Red
  } else if (msg.includes('not completed') || msg.includes('warning') || msg.includes('pending')) {
    type = 'warning' // Yellow
  } else if (msg.includes('completed') || msg.includes('success')) {
    type = 'success' // Green
  }

  const style = getCardStyle(type)
  const isRead = notification.is_read

  return (
    <div
      style={{
        display:       'flex',
        gap:           '12px',
        padding:       '14px 16px',
        borderLeft:    `4px solid ${style.border}`,
        backgroundColor: isRead ? '#f9fafb' : style.bg,
        borderRadius:  '8px',
        marginBottom:  '10px',
        opacity:       isRead ? 0.7 : 1,
        transition:    'all 0.2s ease',
        position:      'relative'
      }}
    >
      {/* Unread dot */}
      {!isRead && (
        <span
          style={{
            position:        'absolute',
            top:             '10px',
            right:           '12px',
            width:           '8px',
            height:          '8px',
            borderRadius:    '50%',
            backgroundColor: style.border
          }}
        />
      )}

      {/* Icon */}
      <div
        style={{
          minWidth:       '38px',
          height:         '38px',
          borderRadius:   '50%',
          backgroundColor: style.iconBg,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:        '18px'
        }}
      >
        {style.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#111827', lineHeight: 1.4 }}>
          {notification.message}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
            {timeAgo(notification.created_at)}
          </span>
          {!isRead && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              style={{
                fontSize:        '11px',
                background:      'none',
                border:          `1px solid ${style.border}`,
                borderRadius:    '4px',
                color:           style.border,
                cursor:          'pointer',
                padding:         '2px 8px',
                fontWeight:      500,
                transition:      'all 0.15s'
              }}
            >
              ✓ Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔔</div>
      <p style={{ margin: 0, fontWeight: 500, fontSize: '15px', color: '#6b7280' }}>
        No notifications yet
      </p>
      <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
        Complete your daily health goals to get started!
      </p>
    </div>
  )
}

// ─── Main Panel ──────────────────────────────────────────────

export function NotificationPanel() {
  const [userId,   setUserId]   = useState(null)
  const [open,     setOpen]     = useState(false)
  const panelRef                = useRef(null)

  // Resolve authenticated user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Request browser notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications(userId)

  const { completionState, isFullyComplete, completedCount } = useSectionCompletion()
  const { activeProfile, allProfiles, switchProfile } = useHealthProfile()

  // --- Dynamic Filter: Hide reminders for completed tasks BUT keep success messages ---
  const filteredNotifications = notifications.filter((n) => {
    const taskKey = n.metadata?.task // e.g., 'diet', 'water', 'exercise', 'sleep', 'mental'
    // Normalize 'stress' to 'mental' if needed
    const normalizedKey = taskKey === 'stress' ? 'mental' : taskKey
    
    // 🛡️ Success-Friendly Logic: We want to see our wins!
    const isSuccess = 
      n.type === 'success' || 
      n.type === 'congratulations' || 
      n.type === 'daily_success' ||
      n.metadata?.event === 'success' || 
      n.message?.toLowerCase().includes('completed')
    
    // If the specific task is completed today, hide its REMINDERS, but keep SUCCESS alerts
    if (normalizedKey && completionState[normalizedKey] === true && !isSuccess) {
      return false
    }
    return true
  })

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'inline-block', zIndex: 9999 }}>
      {/* ── Bell Button ── */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        style={{
          position:        'relative',
          background:      'none',
          border:          'none',
          cursor:          'pointer',
          padding:         '8px',
          borderRadius:    '50%',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          transition:      'background 0.15s'
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {unreadCount > 0 && (
          <span
            style={{
              position:        'absolute',
              top:             '4px',
              right:           '4px',
              minWidth:        '18px',
              height:          '18px',
              borderRadius:    '9px',
              backgroundColor: '#ef4444',
              color:           '#fff',
              fontSize:        '10px',
              fontWeight:      700,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              padding:         '0 4px',
              lineHeight:      1
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Slide-in Panel from Bell ── */}
      {open && (
        <>
          {/* Invisible backdrop just for clicking outside */}
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <div
            role="dialog"
            aria-label="Notifications"
            className="fixed top-[70px] sm:top-[calc(64px)] left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] sm:w-[420px] max-w-[420px] max-h-[80vh] sm:max-h-[520px] bg-white border border-gray-100 rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden origin-top"
            style={{
              animation: 'notifDropdown 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
          {/* Header */}
          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '14px 16px',
              borderBottom:   '1px solid #f3f4f6',
              backgroundColor: '#fafafa'
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>
              Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft:      '8px',
                    fontSize:        '11px',
                    backgroundColor: '#ef4444',
                    color:           '#fff',
                    borderRadius:    '999px',
                    padding:         '1px 7px',
                    fontWeight:      600
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background:   'none',
                  border:       '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding:      '4px 10px',
                  fontSize:     '12px',
                  color:        '#374151',
                  cursor:       'pointer',
                  fontWeight:   500
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px' }}>

            {/* --- Completion Status Card --- */}
            <div 
              style={{
                marginBottom: '16px',
                padding: '16px',
                borderRadius: '12px',
                background: isFullyComplete 
                  ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
                  : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: `1px solid ${isFullyComplete ? '#86efac' : '#fde68a'}`,
                textAlign: 'center',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                {isFullyComplete ? '🎊' : '⚡'}
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: isFullyComplete ? '#166534' : '#92400e' }}>
                {isFullyComplete ? 'All Goals Completed!' : 'Keep Going!'}
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: isFullyComplete ? '#15803d' : '#b45309', opacity: 0.9 }}>
                {isFullyComplete 
                  ? `Brilliant work, ${activeProfile?.name || 'there'}! You've crushed all your tasks for today.`
                  : `Hey ${activeProfile?.name || 'there'}, you've completed ${completedCount}/5 tasks. Just a few more to go!`}
              </p>
              
              {!isFullyComplete && (
                <div style={{ marginTop: '10px', height: '6px', background: '#fef3c7', borderRadius: '3px', overflow: 'hidden', border: '1px solid #fde68a' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(completedCount / 5) * 100}%`, 
                    background: '#f59e0b',
                    transition: 'width 0.5s ease-out'
                  }} />
                </div>
              )}
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                Loading…
              </div>
            ) : filteredNotifications.length === 0 ? (
              <EmptyState />
            ) : (
              filteredNotifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onMarkAsRead={markAsRead}
                />
              ))
            )}
          </div>
        </div>
        </>
      )}

      {/* Keyframe animation */}
      <style>{`
        @keyframes notifDropdown {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default NotificationPanel
