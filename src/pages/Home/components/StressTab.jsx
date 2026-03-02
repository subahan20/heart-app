import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Brain } from 'lucide-react'
import MetricHistoryList from '../../../components/common/MetricHistoryList'
import { useBreathingExercise } from '../../../hooks/useBreathingExercise'

const ROUND_COLORS = [
  { active: 'bg-blue-400 text-white shadow-blue-200'    },
  { active: 'bg-blue-500 text-white shadow-blue-300'    },
  { active: 'bg-indigo-500 text-white shadow-indigo-200'},
  { active: 'bg-violet-500 text-white shadow-violet-200'},
  { active: 'bg-green-500 text-white shadow-green-200'  },
]

export default function StressTab({
  dailyMetrics,
  isPastDate,
  openModal,
  dateRange,
  updateStress,
  selectedDate,
}) {
  // Use the hook directly so this tab stays in sync without prop drilling
  const { roundsCompleted, MAX_ROUNDS } = useBreathingExercise(selectedDate)

  // Prefer live hook data; fall back to stressData for history / range mode
  const rounds = roundsCompleted ?? (dailyMetrics.stressData?.breathing_sessions ?? 0)

  return (
    <>
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle>Mental Stress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* ── Breathing rounds today ── */}
          <div className="text-center p-6 bg-purple-50 rounded-2xl">
            <p className="text-sm text-gray-500 mb-1 font-medium">Breathing rounds today</p>
            <p className="text-5xl font-bold text-purple-700">
              {rounds}
              <span className="text-2xl text-gray-400 font-normal"> / {MAX_ROUNDS}</span>
            </p>
            {rounds >= MAX_ROUNDS ? (
              <p className="text-xs text-green-600 font-bold mt-2">✅ Mental wellness complete!</p>
            ) : rounds > 0 ? (
              <p className="text-xs text-purple-500 mt-2">
                ✨ {MAX_ROUNDS - rounds} more round(s) to complete today
              </p>
            ) : null}
          </div>

          {/* ── "How stressed are you today?" + 5 colored tabs ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                How stressed are you today?
              </label>
              <span className="text-xs font-semibold text-blue-600">
                {Math.min(rounds, MAX_ROUNDS)} / {MAX_ROUNDS}
              </span>
            </div>

            <div className="flex gap-2">
              {ROUND_COLORS.map(({ active }, i) => {
                const done = rounds > i
                return (
                  <div
                    key={i}
                    className={`flex-1 py-3 text-center rounded-xl font-semibold text-sm
                      transition-all duration-400 select-none
                      ${done ? `${active} shadow-md scale-105` : 'bg-gray-100 text-gray-400'}`}
                  >
                    {i + 1}
                  </div>
                )
              })}
            </div>

            {rounds >= MAX_ROUNDS && (
              <p className="text-xs font-bold text-green-600 text-center mt-3 animate-pulse">
                🎉 Mental wellness complete for today!
              </p>
            )}
          </div>

          {/* Tip */}
          <div className="p-4 bg-yellow-50 rounded-xl">
            <p className="text-sm text-yellow-800">
              💡 Try 5 minutes of deep breathing or meditation to reduce stress
            </p>
          </div>

          {/* Start button */}
          <Button
            onClick={() => openModal('breathing')}
            disabled={isPastDate || rounds >= MAX_ROUNDS}
            className="w-full h-12 text-base"
          >
            {rounds >= MAX_ROUNDS
              ? '✅ Exercise Complete Today'
              : isPastDate
              ? '📅 Breathing History'
              : '🧘 Start Breathing Exercise'}
          </Button>

        </CardContent>
      </Card>

      {/* ── Stress History ── */}
      <div className="sticky top-[64px] z-10 bg-gray-50/80 backdrop-blur-md py-4 mb-4 mt-8 flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="text-xl font-bold text-slate-800">
          Stress History {dateRange[0] && dateRange[1] &&
            `(Range: ${Array.isArray(dailyMetrics.stressData) ? dailyMetrics.stressData.length : 0} days)`}
        </h3>
      </div>
      <div className="no-scrollbar overflow-y-auto max-h-[500px]">
        <MetricHistoryList
          type="stress"
          data={dateRange[0] && dateRange[1]
            ? dailyMetrics.stressData
            : (dailyMetrics.stressData ? [dailyMetrics.stressData] : [])}
        />
      </div>
    </>
  )
}
