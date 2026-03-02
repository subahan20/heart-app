export const ProgressBar = ({ value, max, label, color = 'green' }) => {
  // Ensure values are valid numbers
  const safeValue = isNaN(value) || value === null || value === undefined ? 0 : Number(value)
  const safeMax = isNaN(max) || max === null || max === undefined ? 100 : Number(max)
  
  const percentage = Math.min((safeValue / safeMax) * 100, 100)
  
  const colorClasses = {
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600'
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">{safeValue}/{safeMax}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}
