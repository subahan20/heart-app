import React from 'react';
import { useActivityTimer } from '../hooks/useActivityTimer';

const ActivityTimer = ({ 
  activityType = 'breathing', 
  durationSeconds = 60,
  title = 'Activity Timer',
  onComplete,
  onError 
}) => {
  const {
    session,
    timeRemaining,
    isRunning,
    isCompleted,
    isLoading,
    error,
    canComplete,
    startSession,
    completeSession,
    cancelSession,
    resetTimer
  } = useActivityTimer({
    activityType,
    durationSeconds,
    onComplete,
    onError
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    startSession();
  };

  const handleComplete = () => {
    completeSession();
  };

  const handleCancel = () => {
    cancelSession();
  };

  const handleReset = () => {
    resetTimer();
  };

  return (
    <div className="activity-timer p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">{title}</h2>
      
      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className={`text-6xl font-mono font-bold ${
          isCompleted ? 'text-green-600' : 
          isRunning ? 'text-blue-600' : 
          'text-gray-600'
        }`}>
          {formatTime(timeRemaining)}
        </div>
        
        {session && (
          <div className="text-sm text-gray-500 mt-2">
            Session ID: {session.id.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {session && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((durationSeconds - timeRemaining) / durationSeconds) * 100}%` 
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            {Math.round(((durationSeconds - timeRemaining) / durationSeconds) * 100)}% complete
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Status Messages */}
      {isCompleted && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          ✓ Activity completed successfully!
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3 justify-center">
        {!session && (
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Starting...' : 'Start Timer'}
          </button>
        )}

        {session && isRunning && !isCompleted && (
          <>
            <button
              onClick={handleComplete}
              disabled={!canComplete || isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Completing...' : 'Complete'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </>
        )}

        {isCompleted && (
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Reset Timer
          </button>
        )}
      </div>

      {/* Security Info */}
      {session && isRunning && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          🔒 Secure backend validation active
        </div>
      )}
    </div>
  );
};

export default ActivityTimer;
