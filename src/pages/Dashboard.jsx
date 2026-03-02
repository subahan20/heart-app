import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Heart, Activity, TrendingUp, Calendar } from 'lucide-react'
import { useHealthProfile } from '../hooks/useHealthProfile'
import { useHealthData } from '../hooks/useHealthData'
import { ExerciseTracker } from '../features/exercise/ExerciseTracker'
import { StressSleepTracker } from '../features/stress/StressSleepTracker'
import { DietPlan } from '../features/diet/DietPlan'
import { aiService } from '../services/aiService'

export default function Dashboard() {
  const { profile, loading } = useHealthProfile()
  const [activeTab, setActiveTab] = useState('overview')
  const [showExerciseTracker, setShowExerciseTracker] = useState(false)
  const [recommendations, setRecommendations] = useState([])

  const healthData = useHealthData(profile?.id)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your health dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">HeartSafe</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {profile?.full_name}</span>
              <Button variant="outline" size="sm">Profile</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <nav className="flex space-x-6 sm:space-x-8 min-w-max border-b border-gray-200">
            {['overview', 'diet', 'exercise', 'logs', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`capitalize pb-3 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === tab
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Heart className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Health Score</p>
                    <p className="text-2xl font-semibold text-gray-900">85/100</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Daily Steps</p>
                    <p className="text-2xl font-semibold text-gray-900">7,542</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Streak</p>
                    <p className="text-2xl font-semibold text-gray-900">12 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Next Checkup</p>
                    <p className="text-2xl font-semibold text-gray-900">5 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Actions</CardTitle>
                <CardDescription>AI-powered recommendations for you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">🚶 Take a 15-minute walk after dinner to help manage blood sugar</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">💧 Drink 2 more glasses of water today</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800">🧘 Try 5 minutes of deep breathing before bed</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Log</CardTitle>
                <CardDescription>Track your health metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  🏃 Log Exercise
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  😴 Log Sleep
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'diet' && <DietPlan />}

        {activeTab === 'exercise' && (
          <ExerciseTracker onSave={healthData.saveExercise} />
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">

            <StressSleepTracker 
              onSaveStress={async (data) => {
                await healthData.saveStress(data)
              }}
              onSaveSleep={async (data) => {
                await healthData.saveSleep(data)
              }}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>BP Trends</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Chart visualization coming soon</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sugar Trends</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Chart visualization coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
