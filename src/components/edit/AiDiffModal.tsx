interface Props {
  open: boolean
  onClose: () => void
  fieldName: string
  currentText: string
  generatedText: string
  onAccept: () => void
  onEdit: () => void
}

export function AiDiffModal({
  open,
  onClose,
  fieldName,
  currentText,
  generatedText,
  onAccept,
  onEdit
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-[var(--c-white)] rounded-[var(--radius-lg)] w-[90%] max-w-[900px] max-h-[80vh] flex flex-col"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-gray-200)]" style={{ padding: '16px 24px' }}>
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-[500] text-[var(--c-gray-900)]">
              AI Generated: {fieldName}
            </h3>
            <span className="px-1.5 py-0.5 rounded-[2px] text-[9px] font-[500] bg-[var(--c-ai-bg)] text-[var(--c-ai)]">
              AI
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--c-gray-400)] hover:text-[var(--c-gray-900)] transition-colors duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
          <div className="grid grid-cols-2 gap-6">
            {/* Current */}
            <div>
              <div className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-3">
                Current
              </div>
              <div
                className="rounded-[var(--radius-md)] border border-[var(--c-gray-200)] min-h-[120px]"
                style={{ padding: '16px' }}
              >
                {currentText ? (
                  <p className="text-[13px] font-[400] leading-[1.7] text-[var(--c-gray-700)] whitespace-pre-wrap">
                    {currentText}
                  </p>
                ) : (
                  <p className="text-[13px] font-[350] text-[var(--c-gray-300)] italic">
                    Empty
                  </p>
                )}
              </div>
            </div>

            {/* Generated */}
            <div>
              <div className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-ai)] mb-3">
                AI Generated
              </div>
              <div
                className="rounded-[var(--radius-md)] border border-[var(--c-ai)]/20 bg-[var(--c-ai-bg)] min-h-[120px]"
                style={{ padding: '16px' }}
              >
                <p className="text-[13px] font-[400] leading-[1.7] text-[var(--c-gray-800)] whitespace-pre-wrap">
                  {generatedText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--c-gray-200)]" style={{ padding: '16px 24px' }}>
          <button
            onClick={onClose}
            className="text-[12px] font-[400] px-4 py-2 rounded-[var(--radius-sm)] text-[var(--c-gray-500)] hover:text-[var(--c-gray-900)] transition-colors duration-200"
          >
            Reject
          </button>
          <button
            onClick={onEdit}
            className="text-[12px] font-[450] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-100)] text-[var(--c-gray-700)] hover:bg-[var(--c-gray-200)] transition-colors duration-200"
          >
            Edit First
          </button>
          <button
            onClick={onAccept}
            className="text-[12px] font-[500] px-5 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors duration-200"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
