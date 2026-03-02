import { useState, useCallback, useRef } from 'react'

export const useCelebration = (initialStreak = 0) => {
  const [congratsType, setCongratsType] = useState('')
  const [showCongratsModal, setShowCongratsModal] = useState(false)
  const [showStreakCelebration, setShowStreakCelebration] = useState(false)
  const [isFireFlying, setIsFireFlying] = useState(false)
  const [visualStreakCount, setVisualStreakCount] = useState(initialStreak)
  const [isCountBumping, setIsCountBumping] = useState(false)
  const celebrationShownRef = useRef(false)

  const triggerCongrats = useCallback((type) => {
    setCongratsType(type)
    setShowCongratsModal(true)
  }, [])

  const closeCongrats = useCallback(() => {
    setShowCongratsModal(false)
    setCongratsType('')
  }, [])

  const triggerStreakCelebration = useCallback(() => {
    if (celebrationShownRef.current) return
    
    celebrationShownRef.current = true
    setShowStreakCelebration(true)
    setIsFireFlying(true)

    setTimeout(() => {
      setIsFireFlying(false)
      setIsCountBumping(true)
      setVisualStreakCount(prev => prev + 1)
      
      setTimeout(() => {
        setIsCountBumping(false)
        setShowStreakCelebration(false)
      }, 1000)
    }, 2000)
  }, [])

  const resetCelebrationFlag = useCallback(() => {
    celebrationShownRef.current = false
  }, [])

  const updateStreakCount = useCallback((count) => {
    setVisualStreakCount(count)
  }, [])

  return {
    congratsType,
    showCongratsModal,
    showStreakCelebration,
    isFireFlying,
    visualStreakCount,
    isCountBumping,
    triggerCongrats,
    closeCongrats,
    triggerStreakCelebration,
    resetCelebrationFlag,
    updateStreakCount
  }
}
