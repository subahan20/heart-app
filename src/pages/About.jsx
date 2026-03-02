import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/common/Card'
import { Heart, Shield, Users, Target } from 'lucide-react'

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Heart className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About HeartSafe</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your trusted companion for preventing and reversing lifestyle diseases through AI-guided daily actions and Indian healthcare wisdom.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Prevention First</h3>
              <p className="text-gray-600 text-sm">Focus on preventing diseases before they start</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Indian Context</h3>
              <p className="text-gray-600 text-sm">Tailored for Indian lifestyle and diet</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Target className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">AI Powered</h3>
              <p className="text-gray-600 text-sm">Smart recommendations based on your data</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Heart className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Trustworthy</h3>
              <p className="text-gray-600 text-sm">Medical accuracy meets modern technology</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Our Mission</h2>
          <div className="prose max-w-none text-gray-600">
            <p className="mb-4">
              Millions of Indians suffer from lifestyle diseases like High BP, Diabetes, Thyroid disorders, and PCOS. 
              Most health apps focus on tracking rather than prevention, and few understand Indian dietary patterns and lifestyle.
            </p>
            <p className="mb-4">
              HeartSafe is built differently. We believe in prevention over cure, in small daily actions over overwhelming data, 
              and in Indian healthcare wisdom combined with modern AI technology.
            </p>
            <p>
              Our goal is to help you build sustainable health habits that prevent disease progression and, 
              in many cases, reverse existing conditions through personalized diet, exercise, and lifestyle modifications.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Supported Conditions</CardTitle>
              <CardDescription>Comprehensive care for common lifestyle diseases</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  High Blood Pressure
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Diabetes (Type 1 & 2)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                  Thyroid Disorders
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-pink-500 rounded-full mr-3"></span>
                  PCOS/PCOD
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
              <CardDescription>Everything you need for better health</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Personalized Indian Diet Plans
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  AI Health Recommendations
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                  Health Metrics Tracking
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-pink-500 rounded-full mr-3"></span>
                  Progress Analytics
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
