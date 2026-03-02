import React from 'react'

const ToastNotifications = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            relative flex items-start gap-3 p-4 rounded-lg shadow-lg border-2
            transform transition-all duration-300 ease-in-out
            animate-in slide-in-from-right fade-in
            max-w-sm
            ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : toast.type === 'warning'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }
          `}
        >
          {/* Close button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Toast content */}
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-1">
              {toast.title}
            </h4>
            <p className="text-xs opacity-90">
              {toast.message}
            </p>
          </div>

          {/* Progress indicator for incomplete activities */}
          {toast.type === 'warning' && (
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          )}
          
          {/* Success indicator */}
          {toast.type === 'success' && (
            <div className="w-2 h-2 rounded-full bg-green-400" />
          )}
        </div>
      ))}
    </div>
  )
}

export default ToastNotifications
