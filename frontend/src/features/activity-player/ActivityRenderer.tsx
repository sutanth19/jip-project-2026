import { useActivityPlayer } from "./ActivityContext"
import { UnsupportedRenderer } from "./components/UnsupportedRenderer"
import { getActivityRenderer } from "./renderer-registry"

export function ActivityRenderer() {
  const { activity } = useActivityPlayer()
  const Renderer = getActivityRenderer(activity.template.rendererKey)
  return Renderer ? <Renderer /> : <UnsupportedRenderer rendererKey={activity.template.rendererKey} />
}
