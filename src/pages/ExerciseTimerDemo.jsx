import React, { useState } from 'react';
import ExerciseTrackerModal from '../features/exercise/ExerciseTrackerModal';

const ExerciseTimerDemo = () => {
  const [showModal, setShowModal] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleModalClose = () => {
    setShowModal(false);
    addLog('Exercise modal closed', 'info');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Secure Exercise Timer Demo
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Exercise Timer Modal */}
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Exercise Timer</h2>
              <p className="text-gray-600 mb-4">
                Test the secure exercise timer with backend validation.
              </p>
              
              <button
                onClick={() => setShowModal(true)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open Exercise Timer
              </button>

              {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <ExerciseTrackerModal
                        onClose={handleModalClose}
                        selectedDate={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Security Features */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-yellow-800 mb-2">🔒 Security Features</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Complete button disabled until timer expires</li>
                <li>• Backend validates exact duration</li>
                <li>• Cannot complete before time finishes</li>
                <li>• User authentication required</li>
                <li>• All actions logged in database</li>
                <li>• Frontend disabled until backend allows</li>
              </ul>
            </div>
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
                    No activity yet. Start the exercise timer to see logs.
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
          </div>
        </div>

        {/* Test Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How to Test Security</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Test Scenario 1: Timed Exercise</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm">
                <li>Select an exercise type</li>
                <li>Set duration (e.g., 2 minutes)</li>
                <li>Click "Start Exercise"</li>
                <li>Try to complete early - button will be disabled</li>
                <li>Wait for timer to reach 0:00</li>
                <li>Exercise auto-completes with backend validation</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Test Scenario 2: Free Exercise</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm">
                <li>Select an exercise type</li>
                <li>Leave duration empty</li>
                <li>Click "Start Exercise"</li>
                <li>"Finish Exercise" button available immediately</li>
                <li>Can complete anytime (no time restriction)</li>
                <li>Still validates through backend</li>
              </ol>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">
              <strong>Security Test:</strong> Even if you enable the complete button via DevTools, 
              the backend will reject early completion attempts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseTimerDemo;
