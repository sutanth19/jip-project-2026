import { GripVertical } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { DraggableLearningCard } from "../../interactions/DraggableLearningCard"
import { getMediaKind } from "../../activity-player.utils"
import { MediaViewer } from "../../components/MediaViewer"
import type { DragDropItem } from "./drag-drop.types"

type DraggableItemCardProps = { item: DragDropItem; selected: boolean; disabled: boolean; result?: "neutral" | "correct" | "incorrect"; onSelect: () => void }

export function DraggableItemCard({ item, selected, disabled, result = "neutral", onSelect }: DraggableItemCardProps) {
  const image = item.media.find((media) => getMediaKind(media) === "image")
  const audio = item.media.find((media) => getMediaKind(media) === "audio")
  return <DraggableLearningCard id={`drag-item:${item.id}`} selected={selected} disabled={disabled} onSelect={onSelect}><Card className={cn("min-h-20 border-2 py-0 shadow-sm", result === "correct" && "border-secondary bg-secondary/10", result === "incorrect" && "border-destructive bg-destructive/10")}><CardContent className="flex min-h-20 items-center gap-3 p-3"><GripVertical className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0 flex-1 space-y-2"><span className="block text-left text-base font-semibold sm:text-lg">{item.text}</span>{image ? <MediaViewer media={image} className="max-h-36 w-full rounded-lg object-contain" /> : null}{audio ? <MediaViewer media={audio} /> : null}</div></CardContent></Card></DraggableLearningCard>
}
