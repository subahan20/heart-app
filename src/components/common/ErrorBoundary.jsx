import React from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Button } from './Button'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Something went wrong</h2>
              <p className="text-slate-500 text-sm font-medium">
                We've encountered an unexpected error while rendering this page.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left overflow-auto max-h-40">
                <p className="text-[10px] font-mono text-rose-600 leading-tight">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-6 font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl py-6 font-bold flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
