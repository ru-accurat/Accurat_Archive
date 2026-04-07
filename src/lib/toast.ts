'use client'

import { toast as sonnerToast } from 'sonner'

interface ErrorOptions {
  retry?: () => void | Promise<void>
  duration?: number
}

interface SuccessOptions {
  duration?: number
}

interface UndoOptions {
  /** Called when the user clicks Undo */
  onUndo: () => void | Promise<void>
  duration?: number
}

/**
 * Centralized toast wrapper. Use this everywhere instead of calling sonner directly.
 *
 * Patterns:
 *   toast.success('Project saved')
 *   toast.error('Failed to save', { retry: () => save() })
 *   toast.undo('Project deleted', { onUndo: () => restore() })
 */
export const toast = {
  success: (message: string, options?: SuccessOptions) => {
    return sonnerToast.success(message, {
      duration: options?.duration ?? 4000,
    })
  },

  error: (message: string, options?: ErrorOptions) => {
    return sonnerToast.error(message, {
      duration: options?.duration ?? 6000,
      action: options?.retry
        ? { label: 'Retry', onClick: () => options.retry?.() }
        : undefined,
    })
  },

  info: (message: string, options?: SuccessOptions) => {
    return sonnerToast(message, {
      duration: options?.duration ?? 4000,
    })
  },

  loading: (message: string) => {
    return sonnerToast.loading(message)
  },

  /**
   * Show a toast with an Undo action. Use after destructive operations
   * where the actual deletion has already happened.
   */
  undo: (message: string, options: UndoOptions) => {
    return sonnerToast(message, {
      duration: options.duration ?? 8000,
      action: {
        label: 'Undo',
        onClick: () => options.onUndo(),
      },
    })
  },

  /**
   * Dismiss a specific toast by id, or all toasts if no id given.
   */
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
}

/** Re-export sonner's toast for advanced cases (promises, custom JSX, etc.) */
export { toast as sonnerToast } from 'sonner'
