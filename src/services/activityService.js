import { supabase } from '../supabaseClient';
import { aiService } from './aiService';

export class ActivityService {
  // Start a new activity session
  static async startActivitySession(activityType, durationSeconds) {
    try {
      // Get user authentication info
      const { data: { user } } = await supabase.auth.getUser();
      const guestSessionId = aiService.getChatSessionId();

      const params = {
        p_activity_type: activityType,
        p_duration_seconds: durationSeconds,
        ...(user ? { p_user_id: user.id } : { p_guest_session_id: guestSessionId })
      };

      const { data, error } = await supabase.rpc('start_activity_session', params);

      if (error) throw error;

      return data[0]; // Returns { success, message, session_id }
    } catch (error) {
      console.error('Error starting activity session:', error);
      throw error;
    }
  }

  // Complete an activity session with secure validation
  static async completeActivitySession(sessionId) {
    try {
      // Get user authentication info
      const { data: { user } } = await supabase.auth.getUser();
      const guestSessionId = aiService.getChatSessionId();

      const params = {
        p_session_id: sessionId,
        ...(user ? { p_user_id: user.id } : { p_guest_session_id: guestSessionId })
      };

      const { data, error } = await supabase.rpc('complete_activity_session', params);

      if (error) throw error;

      return data[0]; // Returns { success, message, session_id }
    } catch (error) {
      console.error('Error completing activity session:', error);
      throw error;
    }
  }

  // Get user's activity sessions
  static async getUserSessions(limit = 50, offset = 0) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('activity_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw error;
    }
  }

  // Get session details
  static async getSession(sessionId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const query = supabase
        .from('activity_sessions')
        .select('*')
        .eq('id', sessionId);

      // Add user filter if authenticated
      if (user) {
        query.eq('user_id', user.id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
  }

  // Get session statistics
  static async getSessionStats(days = 30) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('activity_sessions')
        .select('activity_type, duration_seconds, completed, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Calculate statistics
      const stats = {
        totalSessions: data.length,
        completedSessions: data.filter(s => s.completed).length,
        totalDuration: data.reduce((sum, s) => sum + s.duration_seconds, 0),
        completionRate: data.length > 0 ? (data.filter(s => s.completed).length / data.length) * 100 : 0,
        activityTypes: {}
      };

      // Group by activity type
      data.forEach(session => {
        if (!stats.activityTypes[session.activity_type]) {
          stats.activityTypes[session.activity_type] = {
            total: 0,
            completed: 0,
            duration: 0
          };
        }
        stats.activityTypes[session.activity_type].total++;
        if (session.completed) {
          stats.activityTypes[session.activity_type].completed++;
        }
        stats.activityTypes[session.activity_type].duration += session.duration_seconds;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching session stats:', error);
      throw error;
    }
  }

  // Cancel/abandon a session (optional - for cleanup)
  static async cancelSession(sessionId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const query = supabase
        .from('activity_sessions')
        .update({ 
          updated_at: new Date().toISOString(),
          notes: 'Cancelled by user'
        })
        .eq('id', sessionId);

      if (user) {
        query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error cancelling session:', error);
      throw error;
    }
  }
}
