import { create } from 'zustand'
import type { Toast } from '../types'
import { newId } from '../utils/id'

interface ToastState {
  toasts: Toast[]
  push: (message: string, tone?: Toast['tone']) => void
  dismiss: (id: string) => void
}

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = newId('toast')
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, message, tone }] }))
    window.setTimeout(() => get().dismiss(id), 3600)
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))
