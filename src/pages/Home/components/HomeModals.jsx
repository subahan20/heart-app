import React, { useState } from 'react'
import { Modal } from '../../../components/common/Modal'
import BookCallModal from '../../../features/consultation/BookCallModal'
import DietMenuModal from '../../../features/diet/DietMenuModal'
import ExerciseModal from '../../../features/exercise/ExerciseModal'
import WaterModal from '../../../features/water/WaterModal'
import BreathingExerciseModal from '../../../features/stress/BreathingExerciseModal'
import SleepTrackerModal from '../../../features/sleep/SleepTrackerModal'
import ReminderModal from '../../../features/reminders/ReminderModal'
import { ProgressBar } from '../../../components/common/ProgressBar'
import { Button } from '../../../components/common/Button'
import DietHistoryList from '../../../features/diet/DietHistoryList'
import ExerciseHistoryList from '../../../features/exercise/ExerciseHistoryList'
import ExerciseSessionsModal from '../../../features/exercise/ExerciseSessionsModal'
import WeeklyCheckinModal from '../../../features/transformation/WeeklyCheckinModal'
import WeeklyDietPlanModal from '../../../features/transformation/WeeklyDietPlanModal'
import { useTransformation } from '../../../hooks/useTransformation'
import { Phone, Sparkles, AlertTriangle, Activity, TrendingUp, Utensils, X, Loader2, Dumbbell, Calendar, Heart } from 'lucide-react'

export default function HomeModals({ 
  modals, 
  closeModal, 
  selectedDate, 
  dateRange, 
  dailyMetrics, 
  profile
}) {
  const { currentPlan } = useTransformation()
  const weekNumber = currentPlan?.week_number

  return (
    <>
      {/* Diet Menu Modal */}
      <Modal 
        isOpen={modals.diet} 
        onClose={() => closeModal('diet')}
        title={dateRange[0] && dateRange[1] ? "Diet History" : `Log Your Meals${weekNumber ? ` (Week ${weekNumber})` : ''}`}
      >
        <DietMenuModal 
          selectedDate={selectedDate}
          dateRange={dateRange[0] && dateRange[1] ? dateRange : null}
          rangeData={dailyMetrics.dietData}
          onClose={() => closeModal('diet')}
        />
      </Modal>

      {/* Book a Call Modal */}
      <Modal
        isOpen={modals.bookCall}
        onClose={() => closeModal('bookCall')}
        title="Book a Priority Consultation"
      >
        <BookCallModal onClose={() => closeModal('bookCall')} />
      </Modal>

      {/* Today's Exercise Sessions Modal */}
      <Modal
        isOpen={modals.todaysSessions}
        onClose={() => closeModal('todaysSessions')}
        title="Today's Workout Sessions"
      >
        <ExerciseSessionsModal 
          sessions={dailyMetrics.exerciseData?.exercises || []}
          onClose={() => closeModal('todaysSessions')}
        />
      </Modal>

      {/* Exercise Tracker Modal */}
      <Modal 
        isOpen={modals.exercise} 
        onClose={() => closeModal('exercise')}
        title={dateRange[0] && dateRange[1] ? "Exercise History" : "Exercise Tracker"}
      >
        <ExerciseModal 
          selectedDate={selectedDate}
          onClose={() => closeModal('exercise')}
        />
      </Modal>

      {/* Water Modal */}
      <Modal 
        isOpen={modals.water} 
        onClose={() => closeModal('water')}
        title={dateRange[0] && dateRange[1] ? "Water History" : "Track Water Intake"}
      >
        <WaterModal 
          selectedDate={selectedDate}
          dateRange={dateRange[0] && dateRange[1] ? dateRange : null}
          rangeData={dailyMetrics.waterData}
          onClose={() => closeModal('water')}
        />
      </Modal>

      {/* Today's Meals Summary Modal */}
      <Modal
        isOpen={modals.todaysMeals}
        onClose={() => closeModal('todaysMeals')}
        title="Today's Meal Summary"
      >
        <div className="max-h-[70vh] overflow-y-auto no-scrollbar py-2">
          <DietHistoryList data={dailyMetrics.dietData} />
          <Button 
            onClick={() => closeModal('todaysMeals')}
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700"
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Today's Sessions Summary Modal */}
      <Modal
        isOpen={modals.todaysSessions}
        onClose={() => closeModal('todaysSessions')}
        title="Today's Exercise Sessions"
      >
        <div className="max-h-[70vh] overflow-y-auto no-scrollbar py-2">
          <ExerciseHistoryList data={dailyMetrics.exerciseData} />
          <Button 
            onClick={() => closeModal('todaysSessions')}
            className="w-full mt-6 bg-orange-600 hover:bg-orange-700"
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Breathing Exercise Modal */}
      <Modal 
        isOpen={modals.breathing} 
        onClose={() => closeModal('breathing')}
        title={dateRange[0] && dateRange[1] ? "Breathing History" : "Breathing Exercise"}
      >
        <BreathingExerciseModal 
          selectedDate={selectedDate}
          dateRange={dateRange[0] && dateRange[1] ? dateRange : null}
          rangeData={dailyMetrics.stressData}
          onClose={() => closeModal('breathing')}
        />
      </Modal>

      {/* Sleep Tracker Modal */}
      <Modal 
        isOpen={modals.sleep} 
        onClose={() => closeModal('sleep')}
        title={dateRange[0] && dateRange[1] ? "Sleep Details" : "Sleep Schedule Tracker"}
      >
        <SleepTrackerModal 
          selectedDate={selectedDate}
          dateRange={dateRange[0] && dateRange[1] ? dateRange : null}
          rangeData={dailyMetrics.sleepData}
          onClose={() => closeModal('sleep')}
        />
      </Modal>


      {/* Daily Progress Modal */}
      <Modal 
        isOpen={modals.dailyProgress} 
        onClose={() => closeModal('dailyProgress')}
        title="Your Daily Progress"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <ProgressBar 
              label="Diet (kcal)" 
              value={dailyMetrics.calories} 
              max={dailyMetrics.caloriesGoal} 
              color="emerald"
            />
            <ProgressBar 
              label="Exercise (min)" 
              value={dailyMetrics.exercise} 
              max={dailyMetrics.exerciseGoal} 
              color="orange"
            />
            <ProgressBar 
              label="Sleep (hours)" 
              value={dailyMetrics.sleep} 
              max={dailyMetrics.sleepGoal} 
              color="purple"
            />
            <ProgressBar 
              label="Water (glasses)" 
              value={dailyMetrics.water} 
              max={dailyMetrics.waterGoal} 
              color="blue"
            />
          </div>

          <Button 
            onClick={() => closeModal('dailyProgress')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4"
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Weekly Check-in Modal */}
      <Modal
        isOpen={modals.weeklyCheckin}
        onClose={() => closeModal('weeklyCheckin')}
        title="Weekly Health Check-in"
      >
        <WeeklyCheckinModal onClose={() => closeModal('weeklyCheckin')} />
      </Modal>

      <Modal
        isOpen={modals.weeklyDiet}
        onClose={() => closeModal('weeklyDiet')}
        title="Weekly Nutrition Plan"
      >
        <WeeklyDietPlanModal onClose={() => closeModal('weeklyDiet')} />
      </Modal>

      {/* Reminder Settings Modal */}
      <Modal
        isOpen={modals.reminders}
        onClose={() => closeModal('reminders')}
        title="🕒 Reminder Settings"
      >
        <ReminderModal onClose={() => closeModal('reminders')} />
      </Modal>
   
    </>
  )
}
