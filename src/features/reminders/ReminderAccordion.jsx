import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, AlarmClockOff } from 'lucide-react'

const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS = { mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun' }

const DIET_MEAL_TIMES = [
  { label: 'Breakfast', time: '09:00' },
  { label: 'Lunch',     time: '13:00' },
  { label: 'Snacks',    time: '16:00' },
  { label: 'Dinner',    time: '20:00' },
]

const WATER_INTERVALS = [
  { label: 'Every 1 hour',  value: 60  },
  { label: 'Every 2 hours', value: 120 },
  { label: 'Every 3 hours', value: 180 },
]

// ── Section metadata ──────────────────────────────────────────────────────────
const SECTION_META = {
  diet:     { label: 'Diet',           emoji: '🥗', color: 'emerald' },
  exercise: { label: 'Exercise',       emoji: '🏋️', color: 'orange'  },
  water:    { label: 'Water',          emoji: '💧', color: 'blue'    },
  mental:   { label: 'Mental Stress',  emoji: '🧘', color: 'purple'  },
  sleep:    { label: 'Sleep',          emoji: '😴', color: 'indigo'  },
}

// ── Color map ─────────────────────────────────────────────────────────────────
const COLOR = {
  emerald: { toggle: 'bg-emerald-500', header: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  orange:  { toggle: 'bg-orange-500',  header: 'bg-orange-50  border-orange-200',  badge: 'bg-orange-100  text-orange-700'  },
  blue:    { toggle: 'bg-blue-500',    header: 'bg-blue-50    border-blue-200',    badge: 'bg-blue-100    text-blue-700'    },
  purple:  { toggle: 'bg-purple-500',  header: 'bg-purple-50  border-purple-200',  badge: 'bg-purple-100  text-purple-700'  },
  indigo:  { toggle: 'bg-indigo-500',  header: 'bg-indigo-50  border-indigo-200',  badge: 'bg-indigo-100  text-indigo-700'  },
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange, color = 'emerald' }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onChange(!enabled) }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none
        ${enabled ? COLOR[color].toggle : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
        ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

// ── Repeat type selector ──────────────────────────────────────────────────────
function RepeatSelector({ value, onChange }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Repeat</p>
      <div className="flex gap-2 flex-wrap">
        {['daily','weekly','custom'].map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all
              ${value === opt ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Custom day checkboxes ─────────────────────────────────────────────────────
function DayPicker({ value = [], onChange }) {
  const toggle = (day) => {
    if (value.includes(day)) onChange(value.filter(d => d !== day))
    else onChange([...value, day])
  }
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Days</p>
      <div className="flex gap-1.5 flex-wrap">
        {DAYS.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={`w-9 h-9 rounded-full text-xs font-bold transition-all
              ${value.includes(d) ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {DAY_LABELS[d]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Time input ────────────────────────────────────────────────────────────────
function TimeInput({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1">
        {label}
      </label>
      <input
        type="time"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
      />
    </div>
  )
}

// ── DietSection ────────────────────────────────────────────────────────────────
function DietSection({ data, update }) {
  const toggleMealTime = (time) => {
    const cur  = data.specific_times ?? []
    const next = cur.includes(time) ? cur.filter(t => t !== time) : [...cur, time]
    update('specific_times', next)
  }

  return (
    <div className="space-y-4">
      <RepeatSelector value={data.repeat_type} onChange={v => update('repeat_type', v)} />
      {data.repeat_type === 'custom' && (
        <DayPicker value={data.custom_days} onChange={v => update('custom_days', v)} />
      )}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Meal Reminders</p>
        <div className="grid grid-cols-2 gap-2">
          {DIET_MEAL_TIMES.map(({ label, time }) => {
            const active = (data.specific_times ?? []).includes(time)
            return (
              <button
                key={time}
                type="button"
                onClick={() => toggleMealTime(time)}
                className={`flex justify-between items-center px-3 py-2 rounded-lg border text-sm font-medium transition-all
                  ${active ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >
                <span>{label}</span>
                <span className="text-xs opacity-70">{time}</span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">Default reminder: 6:00 PM – 7:00 PM if none selected</p>
      </div>
    </div>
  )
}

// ── ExerciseSection ────────────────────────────────────────────────────────────
function ExerciseSection({ data, update }) {
  return (
    <div className="space-y-4">
      <RepeatSelector value={data.repeat_type} onChange={v => update('repeat_type', v)} />
      {data.repeat_type === 'custom' && (
        <DayPicker value={data.custom_days} onChange={v => update('custom_days', v)} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <TimeInput label="Start Time" value={data.start_time} onChange={v => update('start_time', v)} />
        <TimeInput label="End Time"   value={data.end_time}   onChange={v => update('end_time',   v)} />
      </div>
    </div>
  )
}

// ── WaterSection ───────────────────────────────────────────────────────────────
function WaterSection({ data, update }) {
  return (
    <div className="space-y-4">
      <RepeatSelector value={data.repeat_type} onChange={v => update('repeat_type', v)} />
      {data.repeat_type === 'custom' && (
        <DayPicker value={data.custom_days} onChange={v => update('custom_days', v)} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <TimeInput label="Active From" value={data.start_time} onChange={v => update('start_time', v)} />
        <TimeInput label="Active Until" value={data.end_time}  onChange={v => update('end_time',   v)} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Reminder Frequency</p>
        <div className="flex gap-2 flex-wrap">
          {WATER_INTERVALS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => update('frequency_minutes', value)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all
                ${data.frequency_minutes === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── SimpleTimeSection (mental / sleep) ────────────────────────────────────────
function SimpleTimeSection({ data, update }) {
  return (
    <div className="space-y-4">
      <RepeatSelector value={data.repeat_type} onChange={v => update('repeat_type', v)} />
      {data.repeat_type === 'custom' && (
        <DayPicker value={data.custom_days} onChange={v => update('custom_days', v)} />
      )}
      <TimeInput label="Reminder Time" value={data.start_time} onChange={v => update('start_time', v)} />
    </div>
  )
}

// ── Main accordion item ───────────────────────────────────────────────────────
function AccordionItem({ section, data, onUpdate, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const meta   = SECTION_META[section]
  const colors = COLOR[meta.color]

  const update = (field, value) => onUpdate(section, field, value)

  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${open ? 'shadow-md' : ''}`}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 border-b cursor-pointer ${colors.header} transition-colors`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.emoji}</span>
          <span className="font-semibold text-gray-800 text-sm">{meta.label}</span>
          {data.is_enabled ? (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
              {data.repeat_type}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
              off
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Toggle enabled={data.is_enabled} onChange={v => update('is_enabled', v)} color={meta.color} />
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 py-4 bg-white space-y-4">
          {!data.is_enabled && (
            <div className="flex items-center gap-2 text-sm text-gray-400 italic">
              <AlarmClockOff className="w-4 h-4" />
              Reminders disabled for this section
            </div>
          )}
          {data.is_enabled && (
            <>
              {section === 'diet'     && <DietSection     data={data} update={update} />}
              {section === 'exercise' && <ExerciseSection  data={data} update={update} />}
              {section === 'water'    && <WaterSection     data={data} update={update} />}
              {section === 'mental'   && <SimpleTimeSection data={data} update={update} />}
              {section === 'sleep'    && <SimpleTimeSection data={data} update={update} />}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Exported component ────────────────────────────────────────────────────────
export default function ReminderAccordion({ settings, updateSection }) {
  const sections = ['diet', 'exercise', 'water', 'mental', 'sleep']
  return (
    <div className="space-y-3">
      {sections.map((s, i) => (
        <AccordionItem
          key={s}
          section={s}
          data={settings[s]}
          onUpdate={updateSection}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  )
}
