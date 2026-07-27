import { useActivityPlayer } from "../ActivityContext"

export function useActivityNavigation() {
  const { currentIndex, goToItem, previousItem, nextItem, retryCurrentItem, restartActivity, finishActivity } = useActivityPlayer()
  return { currentIndex, goToItem, previousItem, nextItem, retryCurrentItem, restartActivity, finishActivity }
}
