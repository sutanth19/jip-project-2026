import * as React from "react"
export type ToastTone = "success" | "error" | "warning" | "info"
export type ToastInput = { tone: ToastTone; title: string; description?: string }
export type ToastContextValue = { notify: (message: ToastInput) => void; success: (title: string, description?: string) => void; error: (title: string, description?: string) => void; warning: (title: string, description?: string) => void; info: (title: string, description?: string) => void }
export const ToastContext = React.createContext<ToastContextValue | null>(null)
export function useToast(): ToastContextValue { const context = React.useContext(ToastContext); if (!context) throw new Error("useToast must be used inside ToastProvider."); return context }
