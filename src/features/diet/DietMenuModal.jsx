import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { Button } from '../../components/common/Button'
import { useDailyTracking } from '../../hooks/useDailyTracking'
import { useTransformation } from '../../hooks/useTransformation'
import { useHealthProfile } from '../../hooks/useHealthProfile'
import { Camera, Loader2, Clock, Sparkles } from 'lucide-react'
import { aiService } from '../../services/aiService'
import { storageService } from '../../services/storageService'
import { supabase } from '../../services/supabase'

// ── Time slot logic ───────────────────────────────────────────────────────────
function getMealSlot(hour) {
  if (hour >= 6  && hour < 12) return 'breakfast'
  if (hour >= 12 && hour < 16) return 'lunch'
  if (hour >= 16 && hour < 20) return 'snacks'
  return 'dinner'
}

const SLOT_META = {
  breakfast: { label: 'Breakfast',       emoji: '🌅', range: '6:00 AM – 11:59 AM', color: 'amber',  tip: 'Start your day with a nutritious breakfast!' },
  lunch:     { label: 'Lunch',           emoji: '☀️', range: '12:00 PM – 3:59 PM', color: 'green',  tip: 'Have a balanced lunch for sustained energy.' },
  snacks:    { label: 'Snacks / Juice',  emoji: '🥤', range: '4:00 PM – 7:59 PM',  color: 'orange', tip: '4–6 PM: Light snacks. 6–8 PM: Healthy juice recommended!' },
  dinner:    { label: 'Dinner',          emoji: '🌙', range: '8:00 PM onwards',     color: 'indigo', tip: 'Keep dinner light and nutritious.' },
}

const COLOR_MAP = {
  amber:  { header: 'bg-amber-50  border-amber-300',  badge: 'bg-amber-500  text-white', card: 'border-amber-400 bg-amber-50'   },
  green:  { header: 'bg-green-50  border-green-300',  badge: 'bg-green-500  text-white', card: 'border-green-400 bg-green-50'   },
  orange: { header: 'bg-orange-50 border-orange-300', badge: 'bg-orange-500 text-white', card: 'border-orange-400 bg-orange-50' },
  indigo: { header: 'bg-indigo-50 border-indigo-300', badge: 'bg-indigo-500 text-white', card: 'border-indigo-400 bg-indigo-50' },
}

const MEAL_TABS = [
  { key: 'breakfast', emoji: '🌅', label: 'Breakfast' },
  { key: 'lunch',     emoji: '☀️', label: 'Lunch'     },
  { key: 'snacks',    emoji: '🥤', label: 'Snacks'    },
  { key: 'dinner',    emoji: '🌙', label: 'Dinner'    },
]

export default function DietMenuModal({ onClose, selectedDate, dateRange, rangeData }) {
  const { useDailyData, saveDietData } = useDailyTracking()
  const { currentPlan } = useTransformation()
  const { profile } = useHealthProfile()
  const dailyDataQuery  = useDailyData(selectedDate)
  const today           = new Date().toISOString().split('T')[0]
  const isPastDate      = selectedDate < today
  const fileInputRef    = useRef(null)

  const nowHour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false })
  const timeBasedSlot = getMealSlot(Number(nowHour))

  const completedSlots = dailyDataQuery.data?.diet?.meals 
    ? Object.entries(dailyDataQuery.data.diet.meals).filter(([_, items]) => items?.length > 0).map(([type]) => type)
    : []

  // Auto-select logic: Prioritize the time-based slot if not completed, 
  // otherwise find the first non-completed slot in the sequence.
  const getInitialSlot = () => {
    if (!completedSlots.includes(timeBasedSlot)) return timeBasedSlot;
    const firstAvailable = MEAL_TABS.find(tab => !completedSlots.includes(tab.key));
    return firstAvailable ? firstAvailable.key : timeBasedSlot; // Fallback to time-based if all done
  }

  const [selectedMealType, setSelectedMealType] = useState(getInitialSlot())
  const [selectedItems,    setSelectedItems]    = useState([])
  const [isAnalyzing,      setIsAnalyzing]      = useState(false)
  const [aiAdvice,         setAiAdvice]         = useState(null)

  const isRangeMode = dateRange && dateRange[0] && dateRange[1]

  // ── AI-fetched suggestions per meal tab ───────────────────────────────────
  const [aiItems,      setAiItems]      = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  // Cache so we don't re-fetch the same tab twice per modal open
  const itemCacheRef = useRef({})

  useEffect(() => {
    if (itemCacheRef.current[selectedMealType]) {
      setAiItems(itemCacheRef.current[selectedMealType])
      return
    }
    let cancelled = false
    setLoadingItems(true)
    aiService.getMealSuggestions(selectedMealType, profile || currentPlan?.user_profile || null)
      .then(items => {
        if (!cancelled) {
          itemCacheRef.current[selectedMealType] = items
          setAiItems(items)
        }
      })
      .finally(() => { if (!cancelled) setLoadingItems(false) })
    return () => { cancelled = true }
  }, [selectedMealType, profile, currentPlan])

  // Load saved items from DB
  useEffect(() => {
    if (!isRangeMode && dailyDataQuery.data?.diet?.meals) {
      const meals = dailyDataQuery.data.diet.meals
      const flat  = Object.entries(meals).flatMap(([type, items]) =>
        (items ?? []).map(item => ({ ...item, mealType: type }))
      )
      setSelectedItems(flat)
    }
  }, [dailyDataQuery.data, isRangeMode])

  const toggleItem = (item) => {
    const exists = selectedItems.find(i => i.name === item.name && i.mealType === selectedMealType)
    if (exists) {
      setSelectedItems(selectedItems.filter(i => !(i.name === item.name && i.mealType === selectedMealType)))
    } else {
      setSelectedItems([...selectedItems, { ...item, mealType: selectedMealType }])
    }
  }

  const isSelected = (item) =>
    selectedItems.some(i => i.name === item.name && i.mealType === selectedMealType)

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setIsAnalyzing(true)
      setAiAdvice(null)
      const base64 = await aiService.resizeImage(file)
      let imageUrl = null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        imageUrl = await storageService.uploadFoodImage(base64, user?.id)
      } catch {}
      const data = await aiService.analyzeFoodImage(file, imageUrl)
      if (!data) throw new Error('No analysis data received')

      if (data.heart_health_advice) setAiAdvice(data.heart_health_advice)
      setSelectedItems(prev => [...prev, {
        name:     data.name     || 'Unknown Food',
        calories: Number(data.calories) || 0,
        protein:  data.protein,
        carbs:    data.carbs,
        fat:      data.fat,
        weight:   data.estimated_weight,
        mealType: data.type || selectedMealType,
        imageUrl,
        isAI: true,
      }])
      if (data.type) {
        const type = data.type.toLowerCase().trim()
        const normalized = type.endsWith('s') ? type : type + 's'
        if (SLOT_META[normalized]) setSelectedMealType(normalized)
      }
    } catch { toast.error('Failed to analyze image') }
    finally   { setIsAnalyzing(false); event.target.value = '' }
  }

  const handleSave = async () => {
    if (selectedItems.length === 0) { toast.warning('Select at least one item'); return }
    try {
      setIsAnalyzing(true)
      const mealNames  = selectedItems.map(i => i.name)
      const aiAnalysis = await aiService.analyzeManualMeals(mealNames).catch(() => null)
      if (aiAnalysis?.heart_health_advice) setAiAdvice(aiAnalysis.heart_health_advice)
      toast.success(`✅ ${selectedItems.length > 1 ? selectedItems.length + ' items' : selectedItems[0].name} logged!`)
    } finally { setIsAnalyzing(false) }

    const grouped = selectedItems.reduce((acc, item) => {
      if (!acc[item.mealType]) acc[item.mealType] = []
      acc[item.mealType].push({ name: item.name, calories: item.calories, imageUrl: item.imageUrl,
        protein: item.protein, carbs: item.carbs, fat: item.fat, weight: item.weight })
      return acc
    }, {})

    const latestImage  = [...selectedItems].reverse().find(i => i.imageUrl)?.imageUrl ?? null
    const totalCalories = selectedItems.reduce((s, i) => s + i.calories, 0)

    try {
      await saveDietData({ 
        date: selectedDate, 
        meals: grouped, 
        total_calories: totalCalories, 
        food_image: latestImage 
      })
      onClose()
      setSelectedItems([])
    } catch (err) {
      toast.error('Failed to save meals')
    }
  }

  const totalCalories = selectedItems.reduce((s, i) => s + i.calories, 0)
  const meta   = SLOT_META[selectedMealType] || SLOT_META.lunch
  const colors = COLOR_MAP[meta.color] || COLOR_MAP.green

  // ── Range mode ── 
  if (isRangeMode) {
    const rangeList = Array.isArray(rangeData) ? rangeData : []
    return (
      <div className="no-scrollbar space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {rangeList.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No meal data recorded for this period.</p>
        ) : (
          rangeList.map((day, idx) => {
            const dayMeals = day.meals || {}
            const hasMeals = Object.values(dayMeals).some(arr => arr?.length > 0)
            return (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
                  <h4 className="font-bold text-gray-800">
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </h4>
                  <span className="text-green-600 font-bold">{day.total_calories || 0} cal</span>
                </div>
                {hasMeals ? (
                  <div className="space-y-1">
                    {Object.entries(dayMeals).map(([type, items]) =>
                      items?.length > 0 && (
                        <div key={type} className="text-sm">
                          <span className="font-semibold capitalize text-gray-700">{type}: </span>
                          <span className="text-gray-600">{items.map(i => i.name).join(', ')}</span>
                        </div>
                      )
                    )}
                  </div>
                ) : <p className="text-xs text-gray-400 italic">No meals logged</p>}
              </div>
            )
          })
        )}
        <div className="sticky bottom-0 bg-white pt-4 border-t mt-4">
          <Button onClick={onClose} variant="outline" className="w-full">Close</Button>
        </div>
      </div>
    )
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 text-gray-900">

      {isPastDate && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 text-blue-700">
          <span className="text-xl">📅</span>
          <div>
            <p className="text-sm font-bold mb-1">Viewing History</p>
            <p className="text-xs leading-relaxed opacity-90">
              Logs can only be added or changed on the day they happen. Keep up the great work!
            </p>
          </div>
        </div>
      )}

      {/* ── Meal type tab bar ── */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
        {MEAL_TABS.map(({ key, emoji, label }) => {
          const isActive  = selectedMealType === key
          const isCompleted = completedSlots.includes(key)
          const hasItems  = selectedItems.some(i => i.mealType === key)
          
          return (
            <button
              key={key}
              type="button"
              disabled={isPastDate || isCompleted}
              onClick={() => setSelectedMealType(key)}
              className={`flex-1 flex flex-col items-center py-2 rounded-lg text-xs font-semibold transition-all duration-200 relative
                ${isActive ? 'bg-white shadow-sm text-gray-900 scale-105' : 'text-gray-500 hover:text-gray-700'}
                ${isCompleted ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              <span className="text-base">{isCompleted ? '✅' : emoji}</span>
              <span className="mt-0.5">{isCompleted ? 'Logged' : label}</span>
              {hasItems && !isCompleted && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Slot info banner ── */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${colors.header}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <p className="text-xs font-bold text-gray-800">{meta.label}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />{meta.range}
            </p>
          </div>
        </div>
        {selectedMealType === timeBasedSlot && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${completedSlots.includes(timeBasedSlot) ? 'bg-green-100 text-green-700' : colors.badge}`}>
            {completedSlots.includes(timeBasedSlot) ? 'Completed ✅' : 'Now ✨'}
          </span>
        )}
      </div>

      {/* Tip */}
      <p className="text-xs text-gray-500 italic px-1">💡 {meta.tip}</p>

      {/* Camera */}
      {!isPastDate && (
        <div className="flex justify-end">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef}
            onChange={handleImageUpload} disabled={isAnalyzing} />
          <Button variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
            disabled={isAnalyzing}
            onClick={() => fileInputRef.current?.click()}
          >
            {isAnalyzing
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing…</>
              : <><Camera className="w-4 h-4 mr-2" />Snap Meal</>}
          </Button>
        </div>
      )}

      {/* ── Food items grid ── */}
      {loadingItems ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <p className="text-sm text-gray-700 font-medium flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {selectedMealType === 'snacks' ? 'Snack' : meta.label} is Preparing..
          </p>
        </div>
      ) : (
        <div className="no-scrollbar grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
          {aiItems.map(item => (
            <label
              key={item.name}
              className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all duration-150
                ${isSelected(item)
                  ? `${colors.card} border-2 shadow-sm`
                  : 'bg-white border-gray-200 hover:bg-gray-50'}`}
            >
              <input
                type="checkbox"
                checked={isSelected(item)}
                onChange={() => !isPastDate && toggleItem(item)}
                disabled={isPastDate}
                className="w-4 h-4 rounded focus:ring-2 disabled:opacity-50"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-gray-900 leading-tight">{item.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.calories} kcal</p>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* ── Summary strip ── */}
      <div className="bg-gray-50 px-4 py-3 rounded-xl flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500">Selected</p>
          <p className="text-xl font-bold text-gray-900">{selectedItems.length} items</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total Calories</p>
          <p className="text-xl font-bold text-green-600">{totalCalories} kcal</p>
        </div>
      </div>

      {/* AI advice */}
      {!isPastDate && aiAdvice && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl">
          <p className="text-sm font-bold text-green-800 mb-1">💡 AI Heart-Health Tip</p>
          <p className="text-sm text-green-700 leading-relaxed italic">"{aiAdvice}"</p>
        </div>
      )}

      {/* Actions */}
      {!isPastDate && (
        <div className="flex gap-3 pt-3 border-t sticky bottom-0 bg-white">
          <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-100"
            disabled={selectedItems.length === 0 || isAnalyzing}
          >
            {isAnalyzing
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              : `Log ${meta.label}`}
          </Button>
        </div>
      )}
    </div>
  )
}
