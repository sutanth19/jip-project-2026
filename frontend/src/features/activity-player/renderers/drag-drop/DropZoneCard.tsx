import { Inbox } from "lucide-react"
import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { DroppableLearningZone } from "../../interactions/DroppableLearningZone"
import { getMediaKind } from "../../activity-player.utils"
import { MediaViewer } from "../../components/MediaViewer"
import type { DropZone } from "./drag-drop.types"

type DropZoneCardProps = { zone: DropZone; children: ReactNode; disabled: boolean; onSelect: () => void }

export function DropZoneCard({ zone, children, disabled, onSelect }: DropZoneCardProps) {
  const image = zone.media.find((media) => getMediaKind(media) === "image")
  const audio = zone.media.find((media) => getMediaKind(media) === "audio")
  return <DroppableLearningZone id={`drag-zone:${zone.id}`} label={`Zon sasaran ${zone.accessibleLabel}`} disabled={disabled} onSelect={onSelect} className="min-h-32 bg-muted/20"><Card className="border-0 bg-transparent py-0 shadow-none"><CardContent className="space-y-3 p-1"><div className="flex items-center gap-2"><Inbox className="size-5 text-primary" aria-hidden="true" /><h3 className="font-semibold">{zone.text}</h3></div>{image ? <MediaViewer media={image} className="max-h-40 w-full rounded-lg object-contain" /> : null}{audio ? <MediaViewer media={audio} /> : null}{children}</CardContent></Card></DroppableLearningZone>
}
