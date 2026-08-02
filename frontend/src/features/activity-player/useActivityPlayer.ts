import { useContext } from "react"
import { ActivityPlayerContext } from "./activity-player-context-value"
import type { ActivityPlayerContextValue } from "./ActivityContext"
export function useActivityPlayer(): ActivityPlayerContextValue { const context = useContext(ActivityPlayerContext); if (!context) throw new Error("useActivityPlayer must be used within ActivityProvider."); return context }
