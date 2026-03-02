import { useEffect } from 'react'
import { Button } from '../../components/common/Button'
import { Wind, RotateCcw, X } from 'lucide-react'
import { useBreathingExercise } from '../../hooks/useBreathingExercise'

const ROUND_COLORS = [
  'bg-blue-400',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-green-500',
]

export default function BreathingExerciseModal({ onClose, selectedDate }) {
  const {
    roundsCompleted,
    isLoading,
    isSaving,
    timerActive,
    timerSeconds,
    timerCompleted,
    isAllDone,
    isPast,
    MAX_ROUNDS,
    TIMER_SECS,
    startTimer,
    resetTimer,
    saveRound,
    formatTime,
    refetch,
  } = useBreathingExercise(selectedDate)

  // Re-fetch when modal opens to ensure fresh count
  useEffect(() => { refetch() }, [])

  // Progress % for circular ring
  const progress     = ((TIMER_SECS - timerSeconds) / TIMER_SECS) * 100
  const circumference = 2 * Math.PI * 54   // r=54

  // Breathing phase based on timer countdown
  const elapsed   = TIMER_SECS - timerSeconds
  const cycle     = elapsed % 12   // 4s inhale + 4s hold + 4s exhale
  const phase     = !timerActive && !timerCompleted ? 'ready'
    : cycle < 4 ? 'inhale'
    : cycle < 8 ? 'hold'
    : 'exhale'

  const phaseInfo = {
    ready:   { label: 'Ready',  color: 'text-gray-400',   bg: 'bg-gray-100',   ring: '#e5e7eb' },
    inhale:  { label: 'Inhale', color: 'text-blue-600',   bg: 'bg-blue-50',    ring: '#3b82f6' },
    hold:    { label: 'Hold',   color: 'text-purple-600', bg: 'bg-purple-50',  ring: '#8b5cf6' },
    exhale:  { label: 'Exhale', color: 'text-green-600',  bg: 'bg-green-50',   ring: '#22c55e' },
  }
  const pi = phaseInfo[phase]

  return (
    <div className="space-y-6 pb-2">

      {/* ── Header count ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">Rounds completed today</p>
          <p className="text-2xl font-bold text-gray-900">
            {isLoading ? '…' : roundsCompleted}
            <span className="text-gray-400 font-normal text-lg"> / {MAX_ROUNDS}</span>
          </p>
        </div>
        {isAllDone && (
          <span className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full">
            🎉 All done!
          </span>
        )}
      </div>

      {/* ── 5 circular round indicators ── */}
      <div className="flex justify-center gap-3">
        {Array.from({ length: MAX_ROUNDS }).map((_, i) => {
          const done    = roundsCompleted > i
          const color   = ROUND_COLORS[i]
          return (
            <div
              key={i}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-base
                transition-all duration-500 shadow-sm
                ${done ? `${color} text-white scale-110 shadow-md` : 'bg-gray-100 text-gray-300'}`}
            >
              {done ? '✓' : i + 1}
              {/* Pulse ring on current "next" round */}
              {!done && i === roundsCompleted && timerActive && (
                <span className="absolute inset-0 rounded-full bg-blue-300 animate-ping opacity-40" />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Already completed message ── */}
      {isAllDone && (
        <div className="text-center py-4 bg-green-50 rounded-2xl border border-green-200">
          <p className="text-3xl mb-2">🧘‍♂️</p>
          <p className="font-bold text-green-700 text-lg">
            Today your breathing exercise is completed 🎉
          </p>
          <p className="text-sm text-green-600 mt-1">Great job on your mental wellness!</p>
        </div>
      )}

      {/* ── Timer circle ── */}
      {!isAllDone && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-44 h-44">
            {/* Background ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" stroke="#e5e7eb" strokeWidth="8" fill="none" />
              <circle
                cx="60" cy="60" r="54"
                stroke={pi.ring}
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>

            {/* Centre content */}
            <div className={`absolute inset-3 rounded-full flex flex-col items-center justify-center ${pi.bg} transition-colors duration-1000`}>
              <Wind className={`w-6 h-6 mb-1 ${pi.color}`} />
              <p className={`text-2xl font-bold font-mono tabular-nums ${pi.color}`}>
                {formatTime(timerSeconds)}
              </p>
              <p className={`text-xs font-semibold uppercase tracking-wider mt-0.5 ${pi.color}`}>
                {timerCompleted ? 'Done!' : pi.label}
              </p>
            </div>
          </div>

          {/* Breathing pattern guide */}
          {timerActive && (
            <div className="flex gap-4 text-center text-xs text-gray-500">
              <div><span className="block w-2 h-2 bg-blue-400 rounded-full mx-auto mb-1" />Inhale 4s</div>
              <div><span className="block w-2 h-2 bg-purple-400 rounded-full mx-auto mb-1" />Hold 4s</div>
              <div><span className="block w-2 h-2 bg-green-400 rounded-full mx-auto mb-1" />Exhale 4s</div>
            </div>
          )}

          {/* ── Completion message ── */}
          {timerCompleted && (
            <div className="w-full text-center p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-2xl mb-1">✨</p>
              <p className="font-bold text-green-700">Round {roundsCompleted + 1} complete!</p>
              <p className="text-sm text-gray-500 mt-1">
                {roundsCompleted + 1 >= MAX_ROUNDS
                  ? 'Final round — tap Save to finish!'
                  : `${MAX_ROUNDS - roundsCompleted - 1} more round(s) to go`}
              </p>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="w-full grid grid-cols-3 gap-2">
            {/* Start */}
            <Button
              onClick={startTimer}
              disabled={timerActive || timerCompleted || isPast || roundsCompleted >= MAX_ROUNDS}
              className="col-span-1 h-11"
            >
              {timerActive ? '⏳ Running' : '▶ Start'}
            </Button>

            {/* Reset */}
            <Button
              onClick={resetTimer}
              variant="outline"
              disabled={!timerActive && !timerCompleted}
              className="col-span-1 h-11"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>

            {/* Save round */}
            <Button
              onClick={saveRound}
              disabled={!timerCompleted || isSaving || isPast || roundsCompleted >= MAX_ROUNDS}
              className={`col-span-1 h-11 ${timerCompleted
                ? 'bg-green-600 hover:bg-green-700'
                : 'opacity-50 cursor-not-allowed'}`}
            >
              {isSaving ? 'Saving…' : '✅ Save'}
            </Button>
          </div>

          {/* Past date notice */}
          {isPast && (
            <p className="text-xs text-gray-500 italic text-center">
              📅 Viewing past date — exercise logging is read-only.
            </p>
          )}
        </div>
      )}

      {/* ── Close button ── */}
      <Button
        onClick={onClose}
        variant="outline"
        className="w-full h-11"
      >
        <X className="w-4 h-4 mr-2" />
        Complete &amp; Close
      </Button>
    </div>
  )
}
