import React, { useState } from 'react';
import ActivityTimer from '../components/ActivityTimer';

const TimerDemo = () => {
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleComplete = () => {
    addLog('Timer completed successfully!', 'success');
  };

  const handleError = (error) => {
    addLog(`Error: ${error}`, 'error');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Secure Timer Demo
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timer Component */}
          <div>
            <ActivityTimer
              activityType="breathing"
              durationSeconds={60}
              title="Breathing Exercise Timer"
              onComplete={handleComplete}
              onError={handleError}
            />
          </div>

          {/* Activity Log */}
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Activity Log</h2>
                <button
                  onClick={clearLogs}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No activity yet. Start the timer to see logs.
                  </p>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-sm ${
                        log.type === 'success' ? 'bg-green-100 text-green-800' :
                        log.type === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <span className="font-mono text-xs">{log.timestamp}</span>
                      <div>{log.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-yellow-800 mb-2">🔒 Security Features</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Backend validates exact duration</li>
                <li>• Cannot complete before time expires</li>
                <li>• User authentication required</li>
                <li>• All actions logged in database</li>
                <li>• Frontend disabled until backend allows</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Test Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How to Test Security</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Start the 60-second timer</li>
            <li>Try to click "Complete" immediately - it will be disabled</li>
            <li>Wait for timer to reach 0:00</li>
            <li>Now the "Complete" button will work</li>
            <li>Check browser DevTools - you'll see backend validation calls</li>
            <li>Even if you enable the button early, backend will reject completion</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TimerDemo;
