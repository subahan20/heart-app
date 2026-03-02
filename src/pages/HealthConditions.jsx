import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { DISEASE_LABELS } from '../constants/health'

export default function HealthConditions() {
  const conditions = [
    {
      key: 'high_bp',
      title: 'High Blood Pressure',
      description: 'Learn about BP management, diet, and lifestyle changes',
      color: 'border-red-500 bg-red-50'
    },
    {
      key: 'diabetes',
      title: 'Diabetes',
      description: 'Blood sugar control, diet plans, and prevention strategies',
      color: 'border-blue-500 bg-blue-50'
    },
    {
      key: 'thyroid',
      title: 'Thyroid Disorders',
      description: 'Thyroid health, symptoms, and treatment options',
      color: 'border-purple-500 bg-purple-50'
    },
    {
      key: 'pcos',
      title: 'PCOS/PCOD',
      description: 'Hormonal balance, diet, and lifestyle management',
      color: 'border-pink-500 bg-pink-50'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Health Conditions</h1>
          <p className="text-xl text-gray-600">Learn about managing and preventing lifestyle diseases</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {conditions.map((condition) => (
            <Card key={condition.key} className={`border-l-4 ${condition.color}`}>
              <CardHeader>
                <CardTitle>{condition.title}</CardTitle>
                <CardDescription>{condition.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Learn More</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Prevention Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🥗</span>
              </div>
              <h3 className="font-semibold mb-2">Healthy Diet</h3>
              <p className="text-gray-600 text-sm">Balanced nutrition with Indian foods</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏃</span>
              </div>
              <h3 className="font-semibold mb-2">Regular Exercise</h3>
              <p className="text-gray-600 text-sm">30 minutes daily physical activity</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">😴</span>
              </div>
              <h3 className="font-semibold mb-2">Quality Sleep</h3>
              <p className="text-gray-600 text-sm">7-8 hours of restful sleep</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
