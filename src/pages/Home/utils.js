export const getCongratsMessage = (goal, dailyMetrics) => {
  const messages = {
    diet: {
      title: 'Diet Goal Met!',
      message: `Excellent! You've reached your daily goal of ${dailyMetrics.caloriesGoal} calories!`
    },
    exercise: {
      title: 'Exercise Goal Achieved!',
      message: `Awesome! You've completed ${dailyMetrics.exercise} minutes of exercise today!`
    },
    sleep: {
      title: 'Sleep Goal Reached!',
      message: `Great! You've got ${dailyMetrics.sleep} hours of rest last night!`
    },
    water: {
      title: 'Hydration Goal Completed!',
      message: `Perfect! You've drank ${dailyMetrics.water} glasses of water today!`
    },
    stress: {
      title: 'Stress Well Managed!',
      message: `Great job! You've maintained a stress level of ${dailyMetrics.stressLevel}/5 today!`
    }
  }

  return messages[goal] || { title: 'Goal Achieved!', message: 'Congratulations on completing your daily goal!' }
}
