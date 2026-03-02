import { Clock, Save, Loader2 } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { useReminderSettings } from '../../hooks/useReminderSettings'
import ReminderAccordion from './ReminderAccordion'

export default function ReminderModal({ onClose }) {
  const { settings, isLoading, isSaving, updateSection, saveAll } = useReminderSettings()

  const handleSave = async () => {
    await saveAll()
    onClose()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-h-[75vh] flex flex-col">
      {/* Description */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Smart Reminders</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Reminders stop automatically once you complete a section for the day.
          </p>
        </div>
      </div>

      {/* Accordion */}
      <div className="overflow-y-auto flex-1 pr-1 no-scrollbar">
        <ReminderAccordion settings={settings} updateSection={updateSection} />
      </div>

      {/* Footer */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Save Settings</>
          )}
        </Button>
      </div>
    </div>
  )
}
