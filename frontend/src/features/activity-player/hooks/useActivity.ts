import { useCallback, useEffect, useState } from "react"

import { API_BASE_URL } from "@/constants/env"
import type { ActivityPreview } from "../types"

type PreviewResponse = { success: boolean; data?: { activity?: ActivityPreview }; message?: string }

type UseActivityResult = {
  activity: ActivityPreview | null
  isLoading: boolean
  error: string | null
  reload: () => void
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("accessToken") ?? window.sessionStorage.getItem("accessToken")
}

function getPreviewUrl(activityId: string): string {
  return `${API_BASE_URL.replace(/\/$/, "")}/digital-activities/${encodeURIComponent(activityId)}/preview`
}

export function useActivity(activityId: string | undefined): UseActivityResult {
  const [activity, setActivity] = useState<ActivityPreview | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(activityId))
  const [error, setError] = useState<string | null>(activityId ? null : "ID aktiviti tidak sah.")
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((value) => value + 1), [])

  useEffect(() => {
    if (!activityId) return undefined

    const controller = new AbortController()
    const loadActivity = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const accessToken = getAccessToken()
        const response = await fetch(getPreviewUrl(activityId), {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          signal: controller.signal,
        })
        const payload = (await response.json()) as PreviewResponse

        if (!response.ok || !payload.success || !payload.data?.activity) {
          throw new Error(payload.message ?? "Aktiviti tidak dapat dimuatkan.")
        }

        setActivity(payload.data.activity)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return
        setActivity(null)
        setError(caught instanceof Error ? caught.message : "Ralat rangkaian berlaku.")
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadActivity()
    return () => controller.abort()
  }, [activityId, reloadToken])

  return { activity, isLoading, error, reload }
}
