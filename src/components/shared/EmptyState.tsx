interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      {icon && (
        <div className="mb-4 text-[var(--c-gray-300)]">
          {icon}
        </div>
      )}
      <h3 className="text-[14px] font-[500] text-[var(--c-gray-600)] mb-1.5">
        {title}
      </h3>
      <p className="text-[12px] text-[var(--c-gray-400)] text-center max-w-[320px] mb-5">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[11px] font-[500] px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
