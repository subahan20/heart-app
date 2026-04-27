import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { aiService } from '../services/aiService';

/**
 * useWeeklyRewards
 * 
 * Monitors the user's streak and generates "Gift" notifications 
 * at every 7-day milestone (7, 14, 21...).
 */
export const useWeeklyRewards = (streakCount) => {
  const [newReward, setNewReward] = useState(null);
  
  // MINIMALIST SOURCE OF TRUTH: localStorage
  const profileId = localStorage.getItem('activeProfileId')

  useEffect(() => {
    if (!streakCount || streakCount === 0 || streakCount % 7 !== 0) {
      return;
    }

    const checkAndGenerateReward = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const guestSessionId = !user ? aiService.getChatSessionId() : null;
        
        if (!user && !guestSessionId) return;

        // --- SUCCESS REWARD LOGIC ---
        if (streakCount > 0 && streakCount % 7 === 0) {
          // Check if we already gave a reward for this specific milestone
          let query = supabase
            .from('notifications')
            .select('id')
            .eq('category', 'reward')
            .eq('type', 'weekly_perfect')
            .contains('metadata', { streak_milestone: streakCount })
          
          if (profileId) {
            query = query.eq('profile_id', profileId)
          } else {
            query = query.eq(user ? 'user_id' : 'guest_session_id', user ? user.id : guestSessionId)
          }

          const { data: existingReward } = await query.maybeSingle();

          if (!existingReward) {
            // Generate an enthusiastic reward
            const weekNum = streakCount / 7;
            const titles = [
              "YOU ARE UNSTOPPABLE! 🚀",
              "HEALTH WARRIOR UNLOCKED! 🛡️",
              "CONSISTENCY KING/QUEEN! 👑",
              "MONTH OF MASTERY! 🏆",
              "VIBRANT VITALITY! ✨",
              "HALFWAY HERO! 🏅",
              "POWERHOUSE PERFORMANCE! ⚡",
              "ELITE ENDURANCE! 💎",
              "ZEN MASTER OF HEALTH! 🧘",
              "DECADE OF DEDICATION! 🌟",
              "CHAMPION OF CHANGE! 🥇",
              "TRANSFORMATION LEGEND! 🌌"
            ];
            const messages = [
              "A full week of perfect health choices! You're transforming your life one day at a time.",
              "14 days of pure dedication! Your heart and body are thanking you right now.",
              "21 days! You've formed a solid habit. This consistency is exactly what leads to long-term success.",
              "1 Month down! You've matched every single target. This is legendary progress!",
              "35 days of excellence! Your energy levels must be through the roof. Keep shining!",
              "6 weeks complete! You've reached the halfway mark of your 12-week transformation. Pure inspiration!",
              "49 days of grit and grace! You are building a stronger, healthier version of yourself.",
              "2 months of perfect discipline! Your consistency is reaching elite status.",
              "63 days! You've mastered the balance of diet, exercise, and mindfulness.",
              "10 weeks! You're in the home stretch now. The transformation is clearly visible!",
              "77 days! Almost at the finish line. Your commitment to health is simply unmatched.",
              "THE FULL 12 WEEKS! You've done the impossible. You are a true Health Legend! A brand new you!"
            ];

            const title = titles[Math.min(weekNum - 1, titles.length - 1)];
            const message = messages[Math.min(weekNum - 1, messages.length - 1)];

            const { data: reward, error } = await supabase
              .from('notifications')
              .insert({
                user_id: user?.id,
                guest_session_id: guestSessionId,
                profile_id: profileId,
                date: new Date().toISOString().split('T')[0],
                category: 'reward',
                type: 'weekly_perfect',
                title: title,
                message: message,
                is_read: false,
                metadata: { 
                  streak_milestone: streakCount,
                  week_number: weekNum,
                  is_enthusiastic: true
                }
              })
              .select()
              .maybeSingle();

            if (!error && reward) {
              setNewReward(reward);
            }
          }
        }

        // --- ENCOURAGEMENT LOGIC (For missed days) ---
        // If a week has passed since starting/last check-in, but streak is NOT at next milestone
        let profileQuery = supabase
          .from('profiles')
          .select('transformation_start_date, last_weekly_checkin')
        
        if (profileId) {
          profileQuery = profileQuery.eq('id', profileId)
        } else {
          profileQuery = profileQuery.eq(user ? 'user_id' : 'guest_session_id', user ? user.id : guestSessionId)
        }

        const profileResponse = await profileQuery.maybeSingle();

        const p = profileResponse.data;
        if (p) {
          const lastCheckin = p.last_weekly_checkin ? new Date(p.last_weekly_checkin) : null;
          const startDate = p.transformation_start_date ? new Date(p.transformation_start_date) : null;
          const referenceDate = lastCheckin || startDate;
          
          if (referenceDate) {
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const weekHasPassed = (new Date() - referenceDate) >= oneWeek;
            
            // If week is up but streak didn't hit 7 since last milestone
            if (weekHasPassed && streakCount % 7 !== 0) {
              const weekNum = Math.floor((new Date() - (startDate || new Date())) / oneWeek) + 1;
              
              // Only send one encouragement per week
              let encQuery = supabase
                .from('notifications')
                .select('id')
                .eq('category', 'reward')
                .eq('type', 'weekly_encouragement')
                .contains('metadata', { week_number: weekNum })
              
              if (profileId) {
                encQuery = encQuery.eq('profile_id', profileId)
              } else {
                encQuery = encQuery.eq(user ? 'user_id' : 'guest_session_id', user ? user.id : guestSessionId)
              }

              const { data: existingEncouragement } = await encQuery.maybeSingle();

              if (!existingEncouragement) {
                const encouragementTitles = [
                  "DON'T GIVE UP! 💪",
                  "STAY FOCUSED! 🎯",
                  "CONSISTENCY IS KEY! 🔑",
                  "NEW WEEK, NEW GOALS! 🚀",
                  "KEEP PUSHING! ⚡"
                ];
                const encouragementMessages = [
                  "You missed a few targets last week, but every day is a fresh start! Let's aim for a perfect 7/7 this week!",
                  "Progress isn't a straight line. You did great, now let's make the next 7 days even more consistent!",
                  "Mistakes are just lessons in disguise. Reset your focus and let's crush every goal this week!",
                  "You've reached the end of the week. Let's start the next one with 100% dedication!",
                  "Consistency builds the best you. Don't worry about the past—focus on making this week perfect!"
                ];

                const title = encouragementTitles[Math.floor(Math.random() * encouragementTitles.length)];
                const message = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];

                const { data: encouragement, error: encError } = await supabase
                  .from('notifications')
                  .insert({
                    user_id: user?.id,
                    guest_session_id: guestSessionId,
                    profile_id: profileId,
                    date: new Date().toISOString().split('T')[0],
                    category: 'reward',
                    type: 'weekly_encouragement',
                    title: title,
                    message: message,
                    is_read: false,
                    metadata: { 
                      week_number: weekNum,
                      is_encouragement: true
                    }
                  })
                  .select()
                  .maybeSingle();

                if (!encError && encouragement) {
                  setNewReward(encouragement);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to generate weekly reward:', err);
      }
    };

    checkAndGenerateReward();
  }, [streakCount]);

  return {
    newReward,
    clearReward: () => setNewReward(null)
  };
};
