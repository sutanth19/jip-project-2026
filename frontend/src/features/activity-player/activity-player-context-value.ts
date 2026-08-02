import { createContext } from "react"
import type { ActivityPlayerContextValue } from "./ActivityContext"
export const ActivityPlayerContext = createContext<ActivityPlayerContextValue | null>(null)
