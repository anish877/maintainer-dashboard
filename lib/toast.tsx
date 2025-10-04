'use client'

import { ReactElement, useEffect, useState, createContext, useContext, ReactNode } from 'react'

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
  autoHide?: boolean
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  hideToast: (id: string) => void
  clearAllToasts: () => void
}

// Toast Context
const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      id,
      duration: 4000,
      autoHide: true,
      ...toast
    }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto-hide functionality
    if (newToast.autoHide) {
      setTimeout(() => {
        hideToast(id)
      }, newToast.duration)
    }
  }

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const clearAllToasts = () => {
    setToasts([])
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  )
}

// Individual Toast Component
function ToastItem({ toast, onHide, index }: { toast: Toast; onHide: (id: string) => void; index: number }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setIsVisible(true)
  }, [])

  const typeIcon = (type: ToastType): ReactElement<any> => {
    switch (type) {
      case 'success':
        return (
          <svg className="shrink-0 fill-current text-green-500 mt-[3px] mr-3" width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zM7 11.4L3.6 8 5 6.6l2 2 4-4L12.4 6 7 11.4z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="shrink-0 fill-current text-red-500 mt-[3px] mr-3" width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm3.5 10.1l-1.4 1.4L8 9.4l-2.1 2.1-1.4-1.4L6.6 8 4.5 5.9l1.4-1.4L8 6.6l2.1-2.1 1.4 1.4L9.4 8l2.1 2.1z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="shrink-0 fill-current text-yellow-500 mt-[3px] mr-3" width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="shrink-0 fill-current text-purple-500 mt-[3px] mr-3" width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 12H7V7h2v5zM8 6c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
          </svg>
        )
      default:
        return (
          <svg className="shrink-0 fill-current text-purple-500 mt-[3px] mr-3" width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 12H7V7h2v5zM8 6c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
          </svg>
        )
    }
  }

  const getBorderColor = (type: ToastType): string => {
    switch (type) {
      case 'success':
        return 'border-l-green-500'
      case 'error':
        return 'border-l-red-500'
      case 'warning':
        return 'border-l-yellow-500'
      case 'info':
        return 'border-l-purple-500'
      default:
        return 'border-l-purple-500'
    }
  }

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{ marginTop: `${index * 80}px` }}
    >
      <div 
        className={`
          inline-flex min-w-[20rem] max-w-md px-4 py-3 rounded-xl text-sm 
          bg-white dark:bg-gray-800 shadow-lg border-l-4 ${getBorderColor(toast.type)}
          border border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-gray-100 
          backdrop-blur-sm
        `}
      >
        <div className="flex w-full justify-between items-start">
          <div className="flex items-start">
            {typeIcon(toast.type)}
            <div className="font-medium whitespace-pre-line">
              {toast.message}
            </div>
          </div>
          <button 
            className="dark:text-gray-400 opacity-60 hover:opacity-70 ml-3 mt-[3px] transition-opacity" 
            onClick={() => onHide(toast.id)}
            aria-label="Close notification"
          >
            <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16">
              <path d="M7.95 6.536l4.242-4.243a1 1 0 111.415 1.414L9.364 7.95l4.243 4.242a1 1 0 11-1.415 1.415L7.95 9.364l-4.243 4.243a1 1 0 01-1.414-1.415L6.536 7.95 2.293 3.707a1 1 0 011.414-1.414L7.95 6.536z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Toast Container Component
function ToastContainer({ toasts, onHide }: { toasts: Toast[]; onHide: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50">
      {toasts.map((toast, index) => (
        <ToastItem key={toast.id} toast={toast} onHide={onHide} index={index} />
      ))}
    </div>
  )
}

// Convenience hooks for different toast types
export const useToastNotifications = () => {
  const { showToast } = useToast()

  return {
    success: (message: string, options?: { duration?: number; autoHide?: boolean }) => 
      showToast({ type: 'success', message, ...options }),
    
    error: (message: string, options?: { duration?: number; autoHide?: boolean }) => 
      showToast({ type: 'error', message, ...options }),
    
    warning: (message: string, options?: { duration?: number; autoHide?: boolean }) => 
      showToast({ type: 'warning', message, ...options }),
    
    info: (message: string, options?: { duration?: number; autoHide?: boolean }) => 
      showToast({ type: 'info', message, ...options }),
  }
}
