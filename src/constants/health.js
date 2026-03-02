export const DISEASES = {
  HIGH_BP: 'high_bp',
  DIABETES: 'diabetes',
  THYROID: 'thyroid',
  PCOS: 'pcos'
}

export const DISEASE_LABELS = {
  [DISEASES.HIGH_BP]: 'High Blood Pressure',
  [DISEASES.DIABETES]: 'Diabetes',
  [DISEASES.THYROID]: 'Thyroid',
  [DISEASES.PCOS]: 'PCOS/PCOD'
}

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (little or no exercise)' },
  { value: 'light', label: 'Light (1-3 days/week)' },
  { value: 'moderate', label: 'Moderate (3-5 days/week)' },
  { value: 'active', label: 'Active (6-7 days/week)' }
]

export const STRESS_LEVELS = [
  { value: 1, label: 'Very Low', color: 'text-green-600' },
  { value: 2, label: 'Low', color: 'text-green-500' },
  { value: 3, label: 'Moderate', color: 'text-yellow-500' },
  { value: 4, label: 'High', color: 'text-orange-500' },
  { value: 5, label: 'Very High', color: 'text-red-500' }
]

export const EXERCISE_TYPES = [
  { value: 'walking', label: 'Walking', icon: '🚶' },
  { value: 'yoga', label: 'Yoga', icon: '🧘' },
  { value: 'strength', label: 'Strength Training', icon: '💪' },
  { value: 'cardio', label: 'Cardio', icon: '🏃' }
]

export const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACKS: 'snacks'
}
