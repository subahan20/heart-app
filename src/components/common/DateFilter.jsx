import React, { forwardRef } from 'react'
import DatePicker from 'react-datepicker'
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../../utils/cn'

const DateFilter = ({
  selectedDate,
  onDateChange,
  dateRange,
  onRangeChange,
  className
}) => {
  
  // Custom Input Component for the DatePicker
  const CustomInput = forwardRef(({ value, onClick, placeholder }, ref) => (
    <button
      onClick={onClick}
      ref={ref}
      className={cn(
        "flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors w-full sm:w-auto justify-between min-w-[200px]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-5 h-5 text-gray-500" />
        <span className="truncate">
          {value || placeholder || 'Select date'}
        </span>
      </div>
      <ChevronDown className="w-4 h-4 text-gray-400" />
    </button>
  ))
  CustomInput.displayName = 'CustomInput'



  return (
    <div className="flex flex-col lg:flex-row gap-2 lg:items-center w-full lg:w-auto">
      {/* Date Picker - handles both single and range selection */}
      <div className="relative z-20 w-full lg:w-auto">
        <DatePicker
          selectsRange={true}
          startDate={dateRange[0]}
          endDate={dateRange[1]}
          selected={selectedDate ? new Date(selectedDate) : null}
          onChange={(update) => {
            // update is [startDate, endDate] when selecting range
            if (Array.isArray(update)) {
              onRangeChange(update)
              // If only start date selected, also update selectedDate
              if (update[0] && !update[1]) {
                onDateChange(update[0])
              } else if (update[0] && update[1]) {
                // If both selected, we usually want to stay on the range view
              }
            } else {
              onDateChange(update)
              onRangeChange([update, null])
            }
          }}
          customInput={<CustomInput placeholder="Select date or range" />}
          dateFormat="MMM d, yyyy"
          maxDate={new Date()}
          monthsShown={window.innerWidth < 1024 ? 1 : 2}
          shouldCloseOnSelect={false}
        />
      </div>
    </div>
  )
}

export default DateFilter
