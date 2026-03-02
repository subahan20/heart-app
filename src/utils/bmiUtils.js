/**
 * bmiUtils.js
 * 
 * Pure utility functions for BMI calculation, unit conversion, and validation.
 * No React dependencies — fully testable in isolation.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const UNIT_SYSTEMS = {
  US: 'us',
  METRIC: 'metric',
  OTHER: 'other',
}

export const HEIGHT_UNITS = {
  M:      'm',
  CM:     'cm',
  INCHES: 'inches',
  FT_IN:  'ft_in',   // US-specific composite
}

export const WEIGHT_UNITS = {
  KG:  'kg',
  LBS: 'lbs',
}

export const BMI_CATEGORIES = [
  { label: 'Underweight', min: 0,    max: 18.5,    color: '#3b82f6', bg: '#eff6ff', message: 'Your BMI indicates you are underweight. Consider consulting a nutritionist to build a balanced diet plan.' },
  { label: 'Normal',      min: 18.5, max: 25,      color: '#22c55e', bg: '#f0fdf4', message: 'Great news! Your BMI is in the healthy range. Keep maintaining your balanced diet and regular exercise.' },
  { label: 'Overweight',  min: 25,   max: 30,      color: '#f59e0b', bg: '#fffbeb', message: 'Your BMI indicates overweight. Consider improving your diet and increasing physical activity.' },
  { label: 'Obese',       min: 30,   max: Infinity, color: '#ef4444', bg: '#fef2f2', message: 'Your BMI indicates obesity. We strongly recommend consulting your doctor for a personalised health plan.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSION UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert any supported height input to meters.
 * @param {number|{feet:number, inches:number}} value
 * @param {'m'|'cm'|'inches'|'ft_in'} unit
 * @returns {number} height in meters, or NaN if invalid
 */
export function toMeters(value, unit) {
  switch (unit) {
    case HEIGHT_UNITS.M:
      return Number(value)
    case HEIGHT_UNITS.CM:
      return Number(value) / 100
    case HEIGHT_UNITS.INCHES:
      return Number(value) * 0.0254
    case HEIGHT_UNITS.FT_IN: {
      // value must be { feet, inches }
      const feet   = Number(value?.feet   ?? 0)
      const inches = Number(value?.inches ?? 0)
      const totalInches = feet * 12 + inches
      return totalInches * 0.0254
    }
    default:
      return NaN
  }
}

/**
 * Convert any supported weight input to kilograms.
 * @param {number} value
 * @param {'kg'|'lbs'} unit
 * @returns {number} weight in kg, or NaN if invalid
 */
export function toKg(value, unit) {
  switch (unit) {
    case WEIGHT_UNITS.KG:
      return Number(value)
    case WEIGHT_UNITS.LBS:
      return Number(value) * 0.453592
    default:
      return NaN
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BMI CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate BMI given normalised height (m) and weight (kg).
 * Returns NaN for invalid inputs.
 * @param {number} heightMeters
 * @param {number} weightKg
 * @returns {number} BMI rounded to 2 decimal places
 */
export function calcBMI(heightMeters, weightKg) {
  if (!heightMeters || !weightKg || heightMeters <= 0 || weightKg <= 0) return NaN
  const raw = weightKg / (heightMeters * heightMeters)
  return Math.round(raw * 100) / 100
}

/**
 * Classify a BMI value into a category object.
 * @param {number} bmi
 * @returns {{ label, color, bg, message } | null}
 */
export function classifyBMI(bmi) {
  if (isNaN(bmi) || bmi <= 0) return null
  return BMI_CATEGORIES.find(cat => bmi >= cat.min && bmi < cat.max) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// HIGH-LEVEL COMPUTE (single entry point used by the component)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute BMI + category from a form state object.
 * Handles all three unit system modes.
 *
 * @param {object} form - The full form state from useBMIForm
 * @returns {{ bmi: number, category: object|null, heightM: number, weightKg: number }}
 */
export function computeBMIResult(form) {
  let heightM, weightKg

  if (form.unitSystem === UNIT_SYSTEMS.US) {
    // US: feet + inches, pounds
    heightM  = toMeters({ feet: form.heightFeet, inches: form.heightInches }, HEIGHT_UNITS.FT_IN)
    weightKg = toKg(form.weightLbs, WEIGHT_UNITS.LBS)
  } else if (form.unitSystem === UNIT_SYSTEMS.METRIC) {
    // Metric: cm, kg
    heightM  = toMeters(form.heightCm, HEIGHT_UNITS.CM)
    weightKg = toKg(form.weightKg, WEIGHT_UNITS.KG)
  } else {
    // Other: custom height unit + custom weight unit
    heightM  = toMeters(form.heightValue, form.heightUnit)
    weightKg = toKg(form.weightValue, form.weightUnit)
  }

  const bmi      = calcBMI(heightM, weightKg)
  const category = classifyBMI(bmi)

  return { bmi, category, heightM, weightKg }
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a BMI form state.
 * @param {object} form
 * @returns {{ valid: boolean, errors: Record<string,string> }}
 */
export function validateBMIForm(form) {
  const errors = {}

  // Age
  const age = Number(form.age)
  if (!form.age || isNaN(age) || age < 1 || age > 120) {
    errors.age = 'Age must be between 1 and 120.'
  }

  // Gender
  if (!['Male', 'Female', 'Other'].includes(form.gender)) {
    errors.gender = 'Please select a gender.'
  }

  if (form.unitSystem === UNIT_SYSTEMS.US) {
    const feet   = Number(form.heightFeet)
    const inches = Number(form.heightInches)
    const lbs    = Number(form.weightLbs)

    if (isNaN(feet) || feet < 0) errors.heightFeet = 'Enter valid feet.'
    if (isNaN(inches) || inches < 0 || inches >= 12) errors.heightInches = 'Inches must be 0–11.'
    if (feet * 12 + inches <= 0) errors.heightFeet = 'Height must be greater than 0.'
    if (isNaN(lbs) || lbs <= 0) errors.weightLbs = 'Weight must be greater than 0.'

  } else if (form.unitSystem === UNIT_SYSTEMS.METRIC) {
    const cm = Number(form.heightCm)
    const kg = Number(form.weightKg)

    if (isNaN(cm) || cm <= 0) errors.heightCm = 'Height must be greater than 0.'
    if (isNaN(kg) || kg <= 0) errors.weightKg = 'Weight must be greater than 0.'

  } else {
    // OTHER
    const val = Number(form.heightValue)
    const wt  = Number(form.weightValue)

    if (!form.heightUnit) errors.heightUnit = 'Select a height unit.'
    if (!form.weightUnit) errors.weightUnit = 'Select a weight unit.'
    if (isNaN(val) || val <= 0) errors.heightValue = 'Height must be greater than 0.'
    if (isNaN(wt)  || wt  <= 0) errors.weightValue = 'Weight must be greater than 0.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT FORM STATE
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_FORM = {
  unitSystem:    UNIT_SYSTEMS.METRIC,
  age:           '',
  gender:        '',
  // Metric
  heightCm:      '',
  weightKg:      '',
  // US
  heightFeet:    '',
  heightInches:  '0',
  weightLbs:     '',
  // Other
  heightValue:   '',
  heightUnit:    HEIGHT_UNITS.CM,
  weightValue:   '',
  weightUnit:    WEIGHT_UNITS.KG,
}
