import { supabase } from './supabase'
import { aiService } from './aiService'
import { supabaseNotificationService } from './supabaseNotifications'
import { streakService } from './streakService'

// Time-based notification schedule
const NOTIFICATION_SCHEDULE = {
  // Morning notifications (6 AM - 12 PM)
  morning: {
    water: [
      { time: '07:00', message: "💧 Good morning! Start your day with 1 liter of water to stay hydrated." },
      { time: '09:00', message: "💧 Mid-morning hydration! Drink another glass of water to keep energy up." },
      { time: '11:00', message: "💧 Late morning water break! Time to hydrate before lunch." }
    ],
    breakfast: [
      { time: '08:00', message: "🍽️ Breakfast time! Fuel your body with a healthy meal to start your day right." },
      { time: '10:30', message: "🍽️ Morning snack time! Consider a healthy snack to maintain energy." }
    ],
    exercise: [
      { time: '09:00', message: "🏃 Morning exercise time! Get moving to boost your energy and heart health." },
      { time: '12:00', message: "🏃 Lunch break exercise! A short walk after meal helps digestion." },
      { time: '15:00', message: "🏃 Afternoon workout! Time for some physical activity." }
    ],
    meditation: [
      { time: '10:00', message: "🧘 Time for meditation! Reduce stress and start your day with a calm mind." },
      { time: '14:00', message: "🧘 Afternoon meditation! Take a break to clear your mind." },
      { time: '18:00', message: "🧘 Evening relaxation! Wind down with some mindfulness." }
    ]
  },
  
  // Afternoon notifications (12 PM - 6 PM)
  afternoon: {
    lunch: [
      { time: '12:30', message: "🍽️ Lunch time! Enjoy a nutritious meal to keep your energy levels high." },
      { time: '14:30', message: "🍽️ Afternoon snack! Have a healthy snack to maintain your energy levels." }
    ],
    water: [
      { time: '14:00', message: "💧 Afternoon hydration! Drink a glass of water to stay focused and energized." },
      { time: '16:00', message: "💧 Pre-dinner water! Stay hydrated before your evening meal." }
    ],
    snacks: [
      { time: '16:00', message: "🥨 Snack time! Have a healthy snack to maintain your energy levels." },
      { time: '17:30', message: "🥨 Evening snack! Choose something light and nutritious." }
    ]
  },
  
  // Evening notifications (6 PM - 12 AM)
  evening: {
    dinner: [
      { time: '19:00', message: "🍽️ Dinner time! Enjoy a balanced meal to end your day nutritionally." },
      { time: '20:30', message: "🍽️ Light evening snack! Keep it healthy if you're still hungry." }
    ],
    water: [
      { time: '18:00', message: "💧 Pre-dinner hydration! Drink water before your evening meal." },
      { time: '20:00', message: "💧 Evening hydration! Don't forget to drink water before bed." },
      { time: '21:00', message: "💧 Final water intake! Complete your daily hydration goal." }
    ],
    sleepReminder: [
      { time: '21:40', message: "📱 Screen off time! Put away your mobile 20 minutes before sleep for better rest." },
      { time: '22:30', message: "📱 Prepare for sleep! Dim lights and relax your mind." }
    ],
    bedtime: [
      { time: '22:00', message: "😴 Sleep time! Get ready for quality rest to recharge your body and mind." },
      { time: '23:00', message: "😴 Deep sleep time! Ensure your room is dark and quiet for optimal rest." }
    ]
  }
}

// Notification templates for different categories
const NOTIFICATION_TEMPLATES = {
  water: {
    reminder: [
      "💧 Time to hydrate! Drink a glass of water now to keep your heart healthy.",
      "🌊 Water break! Staying hydrated keeps your energy up and heart strong.",
      "💦 Don't forget to sip some water — your body needs it throughout the day."
    ],
    congratulations: [
      "🎉 Amazing! You've reached your daily water goal! Your heart thanks you.",
      "💧 Fantastic! You're properly hydrated today — keep it up!",
      "🌊 Congratulations! Daily hydration goal achieved. Great habit!"
    ],
    warning: [
      "⚠️ You may be overdoing water intake. Pace yourself throughout the day.",
      "💧 Slow down on water — too much at once isn't ideal. Spread it out."
    ]
  },
  diet: {
    reminder: [
      "🥗 Meal time! Don't forget to log your food and maintain balanced nutrition.",
      "🍎 Your body needs fuel! Remember to eat healthy meals throughout the day.",
      "🥑 Nutrition check! Have you had a balanced meal today? Your heart loves healthy foods!",
      "🍽️ Time for a meal break! Eating regularly keeps your metabolism and energy stable."
    ],
    congratulations: [
      "� Excellent! You've met your daily nutrition goals today!",
      "🥗 Perfect! Your balanced diet is supporting your heart health beautifully!",
      "� Amazing! You're fueling your body with all the right nutrients today!"
    ],
    warning: [
      "⚠️ Missing meal data! Don't forget to log your food for accurate tracking.",
      "🥑 Low calories detected! Ensure you're eating enough to support your health goals."
    ]
  },
  exercise: {
    reminder: [
      "🏃 Great day for a workout! Get moving!",
      "💪 Need an energy boost? Try a quick exercise!",
      "🏋️ Time to move! Your body is ready for some physical activity.",
      "� Exercise check! Have you moved your body today?"
    ],
    congratulations: [
      "🎉 Fantastic! You've crushed your exercise goal today!",
      "🏆 Champion! Your dedication to fitness is inspiring!",
      "💪 Incredible! You've built strength and endurance today!"
    ],
    warning: [
      "⚠️ No exercise logged! Remember that movement is medicine for your body.",
      "🏃 Low activity day! Even a short walk can make a difference."
    ]
  },
  sleep: {
    reminder: [
      "\uD83D\uDE34 Time to wind down for quality sleep!",
      "\uD83C\uDF0A Getting ready for bed? Aim for 7-8 hours!",
      "\uD83D\uDE34 Sleep check! Have you logged your sleep today?",
      "\uD83D\uDE4F Sweet dreams ahead! Make sure you get enough hours of quality sleep tonight."
    ],
    congratulations: [
      "\uD83C\uDF1F Perfect! You've got great sleep today! Rest is when your body heals and recharges!",
      "\uD83C\uDF0A Wonderful! Quality sleep like tonight keeps your heart healthy and mind sharp!",
      "\uD83D\uDE34 Excellent sleep habits! Your body thanks you for the proper rest!"
    ],
    warning: [
      "\u26A0\uFE0F You've slept quite a lot. While rest is good, oversleeping can affect your energy.",
      "\uD83D\uDE34 That's a lot of sleep! Try to maintain a consistent sleep schedule for better health."
    ]
  },
  stress: {
    reminder: [
      "\uD83E\uDD85 Take a breath! Stress management is key for heart health. Try a quick meditation.",
      "\uD83C\uDF3F Stress check! Remember to take moments to relax and unwind today.",
      "\uD83E\uDD8A Feeling tense? A few deep breaths can help lower stress and protect your heart.",
      "\uD83C\uDF38 Peace of mind matters! Take a break to de-stress and reset your mind."
    ],
    congratulations: [
      "\uD83C\uDF1F Great job managing your stress today! Keeping calm is wonderful for your heart!",
      "\uD83E\uDD85 Excellent stress levels! Your mindfulness is protecting your long-term health!",
      "\uD83D\uDC9D Wonderful! You're keeping stress in check, which your heart truly appreciates!"
    ],
    warning: [
      "\u26A0\uFE0F Your stress levels are quite high! Consider taking a break and practicing relaxation techniques.",
      "\uD83D\uDE21 High stress detected! Please take time to breathe deeply and calm your mind.",
      "\uD83D\uDEA8 Stress alert! Your heart needs you to slow down and find your calm center."
    ]
  }
}

// Goals for each category
const GOALS = {
  water: 8, // glasses
  diet: 2000, // calories
  exercise: 30, // minutes
  sleep: 8, // hours
  stress: 5 // max acceptable level (0-10 scale)
}

// Over-consumption thresholds
const OVER_CONSUMPTION = {
  water: 15, // glasses - more than this is excessive
  diet: 2500, // calories
  exercise: 120, // minutes (2 hours)
  sleep: 10, // hours
  stress: 7 // level above this is concerning
}

export const notificationService = {
  // Get a random message from templates
  getRandomMessage(category, type) {
    const messages = NOTIFICATION_TEMPLATES[category]?.[type]
    if (!messages || messages.length === 0) {
      return null
    }
    return messages[Math.floor(Math.random() * messages.length)]
  },

  // Fetch user's notifications
  async getNotifications(userId, limit = 50, unreadOnly = false) {
    try {
      const guestSessionId = !userId ? aiService.getChatSessionId() : null
      
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

      if (unreadOnly) {
        query = query.eq('is_read', false)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      return []
    }
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      return null
    }
  },

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      return null
    }
  },

  // Get unread count
  async getUnreadCount(userId) {
    try {
      const guestSessionId = !userId ? aiService.getChatSessionId() : null
      
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

      if (userId) {
        query = query.eq('user_id', userId)
      } else {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { count, error } = await query

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Failed to get unread count:', error)
      return 0
    }
  },

  // Delete old notifications (keep last 30 days)
  async cleanupOldNotifications(userId) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const guestSessionId = !userId ? aiService.getChatSessionId() : null
      
      let query = supabase
        .from('notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo)

      if (userId) {
        query = query.eq('user_id', userId)
      } else {
        query = query.eq('guest_session_id', guestSessionId)
      }

      const { error } = await query

      if (error) throw error
      return true
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error)
      return false
    }
  }
}
