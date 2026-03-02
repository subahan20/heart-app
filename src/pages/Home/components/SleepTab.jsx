import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Moon } from 'lucide-react'
import MetricHistoryList from '../../../components/common/MetricHistoryList'

export default function SleepTab({
  dailyMetrics,
  isPastDate,
  openModal,
  dateRange
}) {
  return (
    <>
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle>Sleep Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-6 bg-indigo-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Last Night</p>
            <p className="text-5xl font-bold text-indigo-700">{dailyMetrics.sleep}h</p>
            <p className="text-sm text-gray-600 mt-2">Sleep Duration</p>
            {dailyMetrics.sleepData && (
              <div className="mt-3 text-xs text-gray-500">
                <span className="font-medium">🌙 {dailyMetrics.sleepData.sleep_time}</span>
                <span className="mx-2">→</span>
                <span className="font-medium">☀️ {dailyMetrics.sleepData.wake_time}</span>
              </div>
            )}
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-600 italic mb-1">Sleep Quality</p>
            {(() => {
              const hours = dailyMetrics.sleep
              let quality = { text: 'Poor', color: 'text-red-600' }
              if (hours > 0) {
                if (hours >= 7 && hours <= 9) quality = { text: 'Good', color: 'text-green-600' }
                else if (hours >= 6 && hours < 7) quality = { text: 'Fair', color: 'text-yellow-600' }
                else if (hours < 6) quality = { text: 'Poor', color: 'text-red-600' }
                else quality = { text: 'Too Much', color: 'text-blue-600' }
              }
              return (
                <p className={`font-black text-xl tracking-tight ${quality.color}`}>
                  {quality.text}
                </p>
              )
            })()}
          </div>

          <div className="mt-8 flex justify-center sm:justify-end">
            <Button 
              onClick={() => openModal('sleep')} 
              disabled={isPastDate}
              className="w-full sm:w-[300px]"
            >
              {isPastDate ? 'Sleep History' : '🌙 Track Sleep Schedule'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sleep History Section */}
      <div className="sticky top-[64px] z-10 bg-gray-50/80 backdrop-blur-md py-4 mb-4 mt-8 flex items-center gap-2">
        <Moon className="w-5 h-5 text-indigo-600" />
        <h3 className="text-xl font-bold text-slate-800">
          Sleep History {dateRange[0] && dateRange[1] && `(Range: ${Array.isArray(dailyMetrics.sleepData) ? dailyMetrics.sleepData.length : 0} days)`}
        </h3>
      </div>
      <div className="no-scrollbar overflow-y-auto max-h-[500px]">
        <MetricHistoryList 
          type="sleep"
          data={dateRange[0] && dateRange[1] 
            ? dailyMetrics.sleepData 
            : (dailyMetrics.sleepData ? [dailyMetrics.sleepData] : [])
          } 
        />
      </div>
    </>
  )
}
