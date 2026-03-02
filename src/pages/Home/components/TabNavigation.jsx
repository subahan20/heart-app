import React from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import DateFilter from '../../../components/common/DateFilter'
import { format } from 'date-fns'

export default function TabNavigation({
  tabs,
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  openModal,
  selectedDate,
  setSelectedDate,
  dateRange,
  setDateRange
}) {
  return (
    <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      <div className="w-full sm:w-auto">
        
        {/* Desktop/Tablet Navigation (Hidden on Mobile) */}
        <div className="hidden sm:block overflow-x-auto no-scrollbar">
          <nav className="flex space-x-4 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 scale-105'
                      : 'bg-white/70 text-slate-600 hover:bg-white/90 backdrop-blur-md border border-white/60 hover:shadow-md'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Mobile Navigation (Hamburger Menu) */}
        <div className="sm:hidden relative">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100 w-full justify-between transition-all active:scale-[0.98] z-20 sticky"
          >
            <div className="flex items-center gap-3 font-semibold text-base text-slate-700">
              {tabs.find(t => t.id === activeTab)?.icon && (
                <span className="text-emerald-600">
                  {(() => {
                    const Icon = tabs.find(t => t.id === activeTab).icon
                    return <Icon className="w-5 h-5" />
                  })()}
                </span>
              )}
              <span>{tabs.find(t => t.id === activeTab)?.label || 'Menu'}</span>
            </div>
            {isMobileMenuOpen ? <X className="w-5 h-5 text-slate-400" /> : <Menu className="w-5 h-5 text-slate-400" />}
          </button>

          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 overflow-hidden z-30">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl font-medium transition-colors w-full text-left ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    {tab.label}
                    {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
         <div className="flex-1 lg:flex-none">
           <DateFilter
             selectedDate={new Date(selectedDate)}
             onDateChange={(date) => setSelectedDate(format(date, 'yyyy-MM-dd'))}
             dateRange={dateRange}
             onRangeChange={setDateRange}
           />
         </div>
      </div>
    </div>
  )
}
