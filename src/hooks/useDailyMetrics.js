import { useReducer } from 'react'

const metricsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_METRICS':
      return { ...state, ...action.payload }
    case 'UPDATE_CALORIES':
      return { ...state, calories: action.payload }
    case 'UPDATE_MEALS':
      return { ...state, meals: action.payload }
    case 'UPDATE_EXERCISE':
      return { ...state, exercise: action.payload }
    case 'UPDATE_SLEEP':
      return { ...state, sleep: action.payload }
    case 'UPDATE_WATER':
      return { ...state, water: action.payload }
    case 'UPDATE_WATER_GOAL':
      return { ...state, waterGoal: action.payload }
    case 'UPDATE_STRESS':
      return { ...state, stressLevel: action.payload }
    case 'SET_DATA':
      return {
        ...state,
        sleepData: action.payload.sleepData,
        exerciseData: action.payload.exerciseData,
        dietData: action.payload.dietData,
        stressData: action.payload.stressData,
        waterData: action.payload.waterData
      }
    case 'RESET':
      return {
        calories: 0,
        caloriesGoal: 2000,
        meals: { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 },
        exercise: 0,
        exerciseGoal: 30,
        sleep: 0,
        sleepGoal: 0.1,
        water: 0,
        waterGoal: 3,
        stressLevel: 3,
        sleepData: null,
        exerciseData: null,
        dietData: null,
        stressData: null,
        waterData: null
      }
    default:
      return state
  }
}

const initialState = {
  calories: 0,
  caloriesGoal: 2000,
  meals: { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 },
  exercise: 0,
  exerciseGoal: 30,
  sleep: 0,
  sleepGoal: 8,
  water: 0,
  waterGoal: 3,
  stressLevel: 3,
  sleepData: null,
  exerciseData: null,
  dietData: null,
  stressData: null,
  waterData: null
}

export const useDailyMetrics = () => {
  const [metrics, dispatch] = useReducer(metricsReducer, initialState)

  return [metrics, dispatch]
}
