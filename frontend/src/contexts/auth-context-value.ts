import * as React from "react"
import type { AuthRole, PermissionKey } from "@/types/auth"

export type AuthContextValue = { isAuthenticated: boolean; loading: boolean; role: AuthRole | null; permissions: PermissionKey[]; hasPermission: (permission: PermissionKey) => boolean; refreshSession: () => Promise<void>; logout: () => void }
export const AuthContext = React.createContext<AuthContextValue | null>(null)
export function useAuthContext(): AuthContextValue { const context = React.useContext(AuthContext); if (!context) throw new Error("useAuthContext must be used inside AuthProvider."); return context }
