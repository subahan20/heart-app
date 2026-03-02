export const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 z-0 transition-opacity bg-opacity-50 backdrop-blur-md"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="relative z-10 bg-white rounded-lg text-left shadow-xl transform transition-all w-full max-w-2xl">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
