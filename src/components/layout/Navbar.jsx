import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="text-xl font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Health Tracker
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/onboarding"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Onboarding
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
