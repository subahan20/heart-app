import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { useHealthProfile } from '../../hooks/useHealthProfile'
import { aiService } from '../../services/aiService'

export function DietPlan() {
  const { profile } = useHealthProfile()
  const [dietPlan, setDietPlan] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      generateDietPlan()
    }
  }, [profile])

  const generateDietPlan = async () => {
    if (!profile) return
    
    setLoading(true)
    try {
      const plan = await aiService.generateDietPlan(profile)
      setDietPlan(plan)
    } catch (error) {
      console.error('Error generating diet plan:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Diet Plan</CardTitle>
          <CardDescription>Generating personalized plan...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!dietPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diet Plan</CardTitle>
          <CardDescription>Complete your profile to get personalized diet recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateDietPlan} disabled={!profile}>
            Generate Diet Plan
          </Button>
        </CardContent>
      </Card>
    )
  }

  const meals = [
    { key: 'breakfast', color: 'border-green-500', bgColor: 'bg-green-50', textColor: 'text-green-800' },
    { key: 'lunch', color: 'border-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-800' },
    { key: 'snacks', color: 'border-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-800' },
    { key: 'dinner', color: 'border-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-800' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Diet Plan</CardTitle>
        <CardDescription>Personalized Indian meal plan for your health</CardDescription>
        <Button variant="outline" size="sm" onClick={generateDietPlan}>
          Regenerate Plan
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {meals.map((meal) => {
            const mealData = dietPlan[meal.key]
            if (!mealData) return null
            
            return (
              <div key={meal.key} className={`border-l-4 ${meal.color} pl-4`}>
                <h4 className={`font-medium ${meal.textColor}`}>
                  {mealData.time || meal.key.charAt(0).toUpperCase() + meal.key.slice(1)}
                </h4>
                <p className="text-sm text-gray-700 font-medium">{mealData.meal}</p>
                {mealData.portion && (
                  <p className="text-xs text-gray-600">Portion: {mealData.portion}</p>
                )}
                {mealData.benefits && (
                  <p className="text-xs text-gray-600 mt-1">{mealData.benefits}</p>
                )}
              </div>
            )
          })}
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h5 className="font-medium text-yellow-800 mb-2">💡 Tips</h5>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Drink 2-3 liters of water throughout the day</li>
            <li>• Eat slowly and mindfully</li>
            <li>• Avoid processed foods and excess sugar</li>
            <li>• Include 30 minutes of physical activity daily</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
