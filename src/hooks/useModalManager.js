import { useReducer, useCallback } from 'react'

const modalReducer = (state, action) => {
  switch (action.type) {
    case 'OPEN':
      return { ...state, [action.modal]: true }
    case 'CLOSE':
      return { ...state, [action.modal]: false }
    case 'TOGGLE':
      return { ...state, [action.modal]: !state[action.modal] }
    case 'CLOSE_ALL':
      return Object.keys(state).reduce((acc, key) => ({ ...acc, [key]: false }), {})
    default:
      return state
  }
}

const initialState = {
  diet: false,
  exercise: false,
  water: false,
  breathing: false,
  sleep: false,
  notification: false,
  meals: false,
  sessions: false,
  congrats: false,
  waterCelebration: false,
  streakCelebration: false,
  dailyProgress: false,
  bookCall: false,
  weeklyCheckin: false,
  weeklyDiet: false,
  reminders: false,
  todaysSessions: false,
  todaysMeals: false,
}

export const useModalManager = () => {
  const [modals, dispatch] = useReducer(modalReducer, initialState)

  const openModal = useCallback((modal) => {
    dispatch({ type: 'OPEN', modal })
  }, [])

  const closeModal = useCallback((modal) => {
    dispatch({ type: 'CLOSE', modal })
  }, [])

  const toggleModal = useCallback((modal) => {
    dispatch({ type: 'TOGGLE', modal })
  }, [])

  const closeAll = useCallback(() => {
    dispatch({ type: 'CLOSE_ALL' })
  }, [])

  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAll
  }
}
