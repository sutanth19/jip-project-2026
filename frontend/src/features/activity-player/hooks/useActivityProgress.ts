import { useActivityPlayer } from "../useActivityPlayer"

export function useActivityProgress() {
  return useActivityPlayer().progress
}
