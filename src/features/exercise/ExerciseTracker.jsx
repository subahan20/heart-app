import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { EXERCISE_TYPES } from '../../constants/health'

export function ExerciseTracker({ onSave }) {
  const [type, setType] = useState('walking')
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState('moderate')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!duration) return

    setLoading(true)
    try {
      const exercise = {
        type,
        duration: parseInt(duration),
        intensity,
        timestamp: new Date().toISOString()
      }
      await onSave(exercise)
      setDuration('')
    } catch (error) {
      console.error('Error saving exercise:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCalories = (type, duration, intensity) => {
    const baseCalories = {
      walking: 4,
      yoga: 3,
      strength: 6,
      cardio: 8
    }
    
    const intensityMultiplier = {
      low: 0.8,
      moderate: 1,
      high: 1.3
    }
    
    return Math.round(baseCalories[type] * duration * intensityMultiplier[intensity])
  }

  const estimatedCalories = duration ? getCalories(type, duration, intensity) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Exercise</CardTitle>
        <CardDescription>Track your physical activity</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Exercise Type</label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {EXERCISE_TYPES.map(exercise => (
                <option key={exercise.value} value={exercise.value}>
                  {exercise.icon} {exercise.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
            <Input
              type="number"
              placeholder="30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Intensity</label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>
          
          {estimatedCalories > 0 && (
            <div className="p-3 rounded-lg bg-green-50 text-green-700">
              <p className="text-sm font-medium">Estimated calories burned: {estimatedCalories}</p>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Log Exercise'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
