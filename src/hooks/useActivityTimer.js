import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { aiService } from '../services/aiService';

// Validate UUID v4 format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export const useActivityTimer = ({ activityType, durationSeconds, onComplete, onError }) => {
  const [session, setSession] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Sync timeRemaining when durationSeconds prop changes (e.g., when user types in the input)
  useEffect(() => {
    if (!isRunning && !isCompleted && !session) {
      setTimeRemaining(durationSeconds);
    }
  }, [durationSeconds, isRunning, isCompleted, session]);

  // Start timer session
  const startSession = useCallback(async (metadata = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get user authentication info
      const { data: { user } } = await supabase.auth.getUser();
      const guestSessionId = !user ? aiService.getChatSessionId() : null;

      const validUserId = isValidUUID(user?.id) ? user.id : null;
      const params = {
        p_activity_type: String(activityType),
        p_duration_seconds: Number(durationSeconds || 0),
        p_exercise_name: metadata.exerciseName ? String(metadata.exerciseName) : null,
        p_intensity: metadata.intensity ? String(metadata.intensity) : 'moderate',
        p_calories_burned: metadata.caloriesEstimate ? Number(metadata.caloriesEstimate) : null,
        p_user_id: validUserId,
        p_guest_session_id: !user ? guestSessionId : null // String or null
      };

      console.error('DEBUG: sending params to start_activity_session:', params);

      // Call RPC to start session ONLY if duration > 0
      let newSession = null;
      if (durationSeconds > 0) {
        const { data, error: rpcError } = await supabase.rpc('start_activity_session', params);
        if (rpcError) {
          console.error('DEBUG: rpcError:', rpcError);
          throw rpcError;
        }
        if (data && data.length > 0 && data[0].success) {
          newSession = {
            id: data[0].session_id,
            startTime: new Date(),
            duration: durationSeconds,
            activityType
          };
        } else {
          throw new Error(data?.[0]?.message || 'Failed to start session');
        }
      } else {
        // Mock session for open-ended timers since backend requires duration > 0
        newSession = {
          id: `local_${Date.now()}`,
          startTime: new Date(),
          duration: 0,
          activityType
        };
      }

      setSession(newSession);
      setIsRunning(true);
      setIsCompleted(false);
      setTimeRemaining(durationSeconds);
      startTimeRef.current = Date.now();
      
      // Start countdown (or countup)
      startCountdown();
    } catch (err) {
      const errorMessage = err.message || 'Failed to start timer';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err; // Bubble up the error so handleStart in ExerciseModal can catch it
    } finally {
      setIsLoading(false);
    }
  }, [activityType, durationSeconds, onComplete, onError]);

  // Countdown logic
  const startCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      if (durationSeconds > 0) {
        const remaining = Math.max(0, durationSeconds - elapsed);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          setIsCompleted(true);
          onComplete?.();
        }
      } else {
        // Open-ended timer (count up)
        setTimeRemaining(elapsed);
      }
    }, 100);
  }, [durationSeconds, onComplete]);

  // Complete session securely
  const completeSession = useCallback(async () => {
    if (!session) {
      return false;
    }
    
    if (isCompleted) {
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get user authentication info
      const { data: { user } } = await supabase.auth.getUser();
      const guestSessionId = !user ? aiService.getChatSessionId() : null;

      const params = {
        p_session_id: session.id,
        ...(user ? { p_user_id: user.id } : { p_guest_session_id: guestSessionId })
      };

      // Call RPC to complete session with backend validation
      const { data, error: rpcError } = await supabase.rpc('complete_activity_session', params);

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        if (data[0].success) {
          setIsCompleted(true);
          setIsRunning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setTimeRemaining(0);
          return true;
        } else {
          // Backend rejected completion - timer not finished
          throw new Error(data[0].message || 'Timer not completed yet');
        }
      } else {
        throw new Error('Failed to complete session');
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to complete timer';
      
      // Don't treat "Session already completed" as an error
      if (errorMessage.includes('Session already completed') || 
          errorMessage.includes('duplicate key value violates unique constraint') ||
          errorMessage.includes('idx_notifications_unified_upsert')) {
        console.warn('Recoverable error during timer completion:', errorMessage);
        setIsCompleted(true);
        setIsRunning(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setTimeRemaining(0);
        return true;
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session, isCompleted, onError]);

  // Cancel session
  const cancelSession = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setSession(null);
    setTimeRemaining(durationSeconds);
    setIsCompleted(false);
    setError(null);
  }, [durationSeconds]);

  // Reset timer
  const resetTimer = useCallback(() => {
    cancelSession();
    startTimeRef.current = null;
  }, [cancelSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-complete when time reaches zero (with small buffer)
  useEffect(() => {
    if (timeRemaining <= 1 && isRunning && session && !isCompleted) {  // Only auto-complete if not already completed
      completeSession().then(success => {
        if (success) {
          onComplete?.();
        }
      }).catch(error => {
        // Silent catch for auto-completion
      });
    }
  }, [timeRemaining, isRunning, session, isCompleted, completeSession, onComplete]);

  return {
    session,
    timeRemaining,
    isRunning,
    isCompleted,
    isLoading,
    error,
    canComplete: timeRemaining === 0,
    startSession,
    completeSession,
    cancelSession,
    resetTimer
  };
};
