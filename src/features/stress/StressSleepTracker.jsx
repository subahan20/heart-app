import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { STRESS_LEVELS } from '../../constants/health'

export function StressSleepTracker({ onSaveStress, onSaveSleep }) {
  const [stressLevel, setStressLevel] = useState(3)
  const [stressReason, setStressReason] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [sleepQuality, setSleepQuality] = useState('good')
  const [loading, setLoading] = useState(false)

  const handleStressSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSaveStress({
        level: stressLevel,
        reason: stressReason,
        timestamp: new Date().toISOString()
      })
      setStressReason('')
    } catch (error) {
      console.error('Error saving stress:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSleepSubmit = async (e) => {
    e.preventDefault()
    if (!sleepHours) return

    setLoading(true)
    try {
      await onSaveSleep({
        hours: parseFloat(sleepHours),
        quality: sleepQuality,
        timestamp: new Date().toISOString()
      })
      setSleepHours('')
    } catch (error) {
      console.error('Error saving sleep:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Log Stress Level</CardTitle>
          <CardDescription>Track your daily stress</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleStressSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Stress Level</label>
              <div className="flex gap-2">
                {STRESS_LEVELS.map(level => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setStressLevel(level.value)}
                    className={`flex-1 py-2 px-1 rounded-md border text-xs font-medium transition-colors ${
                      stressLevel === level.value
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {level.value}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {STRESS_LEVELS.find(l => l.value === stressLevel)?.label}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Reason (optional)</label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={stressReason}
                onChange={(e) => setStressReason(e.target.value)}
              >
                <option value="">Select reason</option>
                <option value="work">Work</option>
                <option value="family">Family</option>
                <option value="health">Health</option>
                <option value="financial">Financial</option>
                <option value="other">Other</option>
              </select>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Log Stress'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log Sleep</CardTitle>
          <CardDescription>Track your sleep patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSleepSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hours of Sleep</label>
              <Input
                type="number"
                step="0.5"
                placeholder="7.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sleep Quality</label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(e.target.value)}
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Log Sleep'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
