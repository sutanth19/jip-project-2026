import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { getMediaKind } from "../../activity-player.utils"
import { MediaViewer } from "../../components/MediaViewer"
import type { FillBlankWordBankEntry } from "./fill-in-the-blank.types"

type FillBlankWordBankProps = { entries: FillBlankWordBankEntry[]; usedEntryIds: ReadonlySet<string>; activeBlankId: string | null; disabled: boolean; onSelect: (entryId: string) => void }

export function FillBlankWordBank({ entries, usedEntryIds, activeBlankId, disabled, onSelect }: FillBlankWordBankProps) {
  if (entries.length === 0) return null
  return <section aria-label="Bank perkataan" className="space-y-3 rounded-xl border bg-muted/20 p-4"><div><h3 className="font-semibold">Bank perkataan</h3><p className="text-sm text-muted-foreground">{activeBlankId ? "Pilih perkataan untuk blank aktif." : "Pilih blank bank perkataan dahulu."}</p></div><div className="flex flex-wrap gap-3">{entries.map((entry) => { const used = entry.singleUse && usedEntryIds.has(entry.id); const image = entry.media.find((media) => getMediaKind(media) === "image"); const audio = entry.media.find((media) => getMediaKind(media) === "audio"); return <div key={entry.id} className="max-w-full space-y-2"><Button type="button" variant="outline" disabled={disabled || !activeBlankId || used} aria-label={`${entry.content}${used ? ", telah digunakan" : ""}`} onClick={() => onSelect(entry.id)} className={cn("h-auto min-h-11 max-w-full justify-start gap-2 whitespace-normal px-4 py-2 text-left text-base motion-reduce:transition-none", used && "line-through")}>{entry.content}{used ? <Check className="size-4 text-secondary" aria-hidden="true" /> : null}{image ? <MediaViewer media={image} className="size-10 rounded object-cover" /> : null}</Button>{audio ? <MediaViewer media={audio} className="max-w-44" /> : null}</div> })}</div></section>
}
