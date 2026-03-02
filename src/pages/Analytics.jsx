import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { useDailyTracking } from '../hooks/useDailyTracking'
import { Utensils, Dumbbell, Moon, Droplets, Brain, Calendar, ChevronLeft, TrendingUp, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  Legend
} from 'recharts'

export default function Analytics() {
  const navigate = useNavigate()
  const { useHistoryData } = useDailyTracking()
  const { data: historyData, isLoading: historyLoading } = useHistoryData(90)

  // Use history data from query or default empty object
  const history = historyData || {
    diet: [],
    exercise: [],
    sleep: [],
    water: [],
    stress: []
  }

  const loading = historyLoading


  // Get last 12 weeks for weekly reports
  const getWeeksData = () => {
    const weeks = []
    const today = new Date()
    
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      const weekDates = []
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        weekDates.push(d.toISOString().split('T')[0])
      }
      
      // Aggregate data for the week
      const weekDiet = history.diet.filter(d => weekDates.includes(d.date))
      const weekExercise = history.exercise.filter(d => weekDates.includes(d.date))
      const weekSleep = history.sleep.filter(d => weekDates.includes(d.date))
      const weekWater = history.water.filter(d => weekDates.includes(d.date))
      const weekStress = history.stress.filter(d => weekDates.includes(d.date))
      
      // ALWAYS create a week entry, even if no data exists
      weeks.push({
        weekLabel: `Week ${i + 1}`,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalCalories: weekDiet.reduce((sum, d) => sum + (d.total_calories || 0), 0),
        totalExercise: weekExercise.reduce((sum, d) => sum + (d.total_minutes || 0), 0),
        avgSleep: weekSleep.length > 0 ? (weekSleep.reduce((sum, d) => sum + (d.duration_hours || 0), 0) / weekSleep.length) : 0,
        totalWater: weekWater.reduce((sum, d) => sum + (d.glasses || 0), 0),
        avgStress: weekStress.length > 0 ? (weekStress.reduce((sum, d) => sum + (d.mental_stress || 0), 0) / weekStress.length) : 0,
        daysWithData: weekDates.filter(date => 
          history.diet.some(d => d.date === date) ||
          history.exercise.some(d => d.date === date) ||
          history.sleep.some(d => d.date === date) ||
          history.water.some(d => d.date === date) ||
          history.stress.some(d => d.date === date)
        ).length,
        // Always include the week dates for reference
        weekDates: weekDates,
        hasAnyData: weekDiet.length > 0 || weekExercise.length > 0 || weekSleep.length > 0 || weekWater.length > 0 || weekStress.length > 0
      })
    }
    
    return weeks.reverse()
  }

  // Format weekly data for charts
  const weeksData = getWeeksData()

  // Get daily data for day-by-day analytics
  const getDailyData = () => {
    const dailyData = []
    const today = new Date()
    
    // Get last 30 days for daily analytics
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const diet = history.diet.find(d => d.date === dateStr)
      const exercise = history.exercise.find(d => d.date === dateStr)
      const sleep = history.sleep.find(d => d.date === dateStr)
      const water = history.water.find(d => d.date === dateStr)
      const stress = history.stress.find(d => d.date === dateStr)
      
      // Calculate activity score (0-100)
      let activityScore = 0
      let completedActivities = 0
      
      // Diet (20 points)
      if (diet && diet.total_calories >= 1500 && diet.total_calories <= 2500) {
        activityScore += 20
        completedActivities++
      }
      
      // Exercise (20 points)
      if (exercise && exercise.total_minutes >= 30) {
        activityScore += 20
        completedActivities++
      }
      
      // Sleep (20 points)
      if (sleep && sleep.duration_hours >= 7 && sleep.duration_hours <= 9) {
        activityScore += 20
        completedActivities++
      }
      
      // Water (20 points)
      if (water && water.glasses >= 8) {
        activityScore += 20
        completedActivities++
      }
      
      // Stress (20 points)
      if (stress && stress.mental_stress <= 2) {
        activityScore += 20
        completedActivities++
      }
      
      dailyData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: dateStr,
        calories: diet?.total_calories || 0,
        exercise: exercise?.total_minutes || 0,
        sleep: sleep?.duration_hours || 0,
        water: water?.glasses || 0,
        stress: stress?.mental_stress || 5,
        activityScore: activityScore,
        completedActivities: completedActivities,
        hasAnyData: !!(diet || exercise || sleep || water || stress)
      })
    }
    
    return dailyData
  }

  const dailyData = getDailyData()

  const DailyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-xl border border-gray-100 rounded-xl">
          <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <p className="text-sm font-bold text-gray-900 capitalize">
                {entry.name}: {entry.value} {entry.name === 'calories' ? 'cal' : entry.name === 'sleep' ? 'h' : entry.name === 'exercise' ? 'min' : entry.name === 'water' ? 'glasses' : entry.name === 'stress' ? '/5' : ''}
              </p>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-xl border border-gray-100 rounded-xl">
          <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <p className="text-sm font-bold text-gray-900 capitalize">
                {entry.name}: {entry.value} {entry.name === 'calories' ? 'cal/week' : entry.name === 'sleep' ? 'h/week' : entry.name === 'exercise' ? 'min/week' : entry.name === 'water' ? 'glasses/week' : ''}
              </p>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const WeeklyChartSection = ({ title, icon: Icon, dataKey, color }) => (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-gray-50`}>
              <Icon className={`w-4 h-4`} style={{ color }} />
            </div>
            <CardTitle className="text-sm font-bold text-gray-700">{title} (Weekly)</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={weeksData}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="weekLabel" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
              dy={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#gradient-${dataKey})`}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )

  if (loading && Object.values(history).every(arr => arr.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="hover:bg-green-50 text-green-700 font-semibold flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5 sm:mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 truncate">
                <TrendingUp className="w-5 h-5 sm:w-6 h-6 text-green-600 flex-shrink-0" />
                <span className="truncate">Health Analytics</span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Weekly Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <WeeklyChartSection title="Calorie Intake" icon={Utensils} dataKey="totalCalories" color="#22c55e" />
            <WeeklyChartSection title="Exercise Minutes" icon={Dumbbell} dataKey="totalExercise" color="#f97316" />
            <WeeklyChartSection title="Avg Sleep Hours" icon={Moon} dataKey="avgSleep" color="#6366f1" />
            <WeeklyChartSection title="Water Intake" icon={Droplets} dataKey="totalWater" color="#3b82f6" />
            <WeeklyChartSection title="Avg Stress Levels" icon={Brain} dataKey="avgStress" color="#a855f7" />
          </div>

          {/* Daily Analytics - Day by Day Activities */}
          <div className="pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Daily Health Activities (Last 30 Days)
              </h3>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-700">Activity Score Overview</h4>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Score: 0-100 (higher is better)</span>
                    <span>Completed: 0-4 activities</span>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                    dy={10}
                  />
                  <Tooltip content={<DailyTooltip />} />
                  <Legend />
                  
                  {/* Diet Calories - Bar */}
                  <Bar dataKey="calories" fill="#22c55e" name="Calories" />
                  
                  {/* Exercise Minutes - Line */}
                  <Line 
                    type="monotone"
                    dataKey="exercise" 
                    stroke="#f97316" 
                    strokeWidth={3}
                    name="Exercise (min)"
                    dot={{ fill: '#f97316', r: 4 }}
                  />
                  
                  {/* Sleep Hours - Area */}
                  <Area
                    type="monotone"
                    dataKey="sleep" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={0.3}
                    fill="#6366f1"
                    name="Sleep (hours)"
                  />
                  
                  {/* Water Glasses - Line */}
                  <Line 
                    type="monotone"
                    dataKey="water" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Water (glasses)"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                  
                  {/* Stress Level - Line */}
                  <Line 
                    type="monotone"
                    dataKey="stress" 
                    stroke="#a855f7" 
                    strokeWidth={3}
                    name="Stress Level"
                    dot={{ fill: '#a855f7', r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Daily Activity Summary */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dailyData.slice(0, 6).map((day, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-700">{day.date}</span>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          day.activityScore >= 80 ? 'bg-green-100 text-green-700' : 
                          day.activityScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                          day.activityScore >= 40 ? 'bg-orange-100 text-orange-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {day.activityScore}/100
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">Diet: {day.calories} cal</span>
                        {day.calories >= 1500 && day.calories <= 2500 && <span className="text-green-600 ml-1">✓</span>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-gray-600">Exercise: {day.exercise} min</span>
                        {day.exercise >= 30 && <span className="text-green-600 ml-1">✓</span>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                        <span className="text-gray-600">Sleep: {day.sleep}h</span>
                        {day.sleep >= 7 && day.sleep <= 9 && <span className="text-green-600 ml-1">✓</span>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600">Water: {day.water} glasses</span>
                        {day.water >= 8 && <span className="text-green-600 ml-1">✓</span>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-600">Stress: {day.stress}/5</span>
                        {day.stress <= 2 && <span className="text-green-600 ml-1">✓</span>}
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        Activities completed: {day.completedActivities}/4
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
