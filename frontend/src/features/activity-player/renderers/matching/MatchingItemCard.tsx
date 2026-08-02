import { Check, Link2, X } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { getMediaKind } from "../../activity-player.utils"
import { MediaViewer } from "../../components/MediaViewer"
import type { PairingOption } from "../../interactions/pairing.types"

type MatchingItemCardProps = {
  option: PairingOption
  side: "left" | "right"
  selected: boolean
  matched: boolean
  result: "neutral" | "correct" | "incorrect"
  disabled: boolean
  onSelect: () => void
}

export function MatchingItemCard({ option, side, selected, matched, result, disabled, onSelect }: MatchingItemCardProps) {
  const image = option.media.find((media) => getMediaKind(media) === "image")
  const audio = option.media.find((media) => getMediaKind(media) === "audio")
  const stateLabel = result === "correct" ? "Padanan tepat" : result === "incorrect" ? "Padanan belum tepat" : matched ? "Sudah dipadankan" : selected ? "Dipilih" : "Belum dipadankan"
  return <button type="button" disabled={disabled} aria-label={`${side === "left" ? "Item kiri" : "Item kanan"}: ${option.accessibleLabel}. ${stateLabel}.`} aria-pressed={selected} onClick={onSelect} className="w-full text-left outline-none disabled:cursor-default disabled:opacity-85">
    <Card className={cn("min-h-24 border-2 py-0 shadow-sm transition-all motion-reduce:transition-none", "focus-within:ring-3", selected && "border-primary bg-primary/5 ring-2 ring-primary/30", matched && "border-secondary/60", result === "correct" && "border-secondary bg-secondary/10", result === "incorrect" && "border-destructive bg-destructive/10")}>
      <CardContent className="flex min-h-24 items-center gap-3 p-4 sm:min-h-28">
        <Link2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-2"><p className="text-base font-semibold sm:text-lg">{option.text}</p>{image ? <MediaViewer media={image} className="max-h-40 w-full rounded-lg object-contain" /> : null}{audio ? <MediaViewer media={audio} /> : null}</div>
        {result === "correct" ? <Check className="size-5 shrink-0 text-secondary" aria-label="Padanan tepat" /> : null}
        {result === "incorrect" ? <X className="size-5 shrink-0 text-destructive" aria-label="Padanan belum tepat" /> : null}
      </CardContent>
    </Card>
  </button>
}
