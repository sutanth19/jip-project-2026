import { useActivityPlayer } from "../ActivityContext"

export function useActivityProgress() {
  return useActivityPlayer().progress
}
