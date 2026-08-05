import { useNavigate, useParams } from "react-router-dom"

import { ActivityProvider } from "./ActivityContext"
import { ActivityPlayerShell } from "./ActivityPlayerShell"
import { ActivityErrorState } from "./components/ErrorState"
import { ActivityLoadingState } from "./components/LoadingState"
import { useActivity } from "./hooks/useActivity"

export function ActivityPlayerPage() {
  const { activityId } = useParams<{ activityId: string }>()
  const navigate = useNavigate()
  const { activity, isLoading, error, reload } = useActivity(activityId)
  const exit = () => navigate("/dashboard/aktiviti")

  if (isLoading) return <ActivityLoadingState />
  if (error || !activity) return <ActivityErrorState message={error ?? "Aktiviti tidak ditemui atau telah dipadamkan."} onRetry={reload} onExit={exit} />

  return <ActivityProvider activity={activity}><ActivityPlayerShell onExit={exit} /></ActivityProvider>
}
