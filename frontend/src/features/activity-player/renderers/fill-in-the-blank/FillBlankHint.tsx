import { Lightbulb } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { MediaViewer } from "../../components/MediaViewer"
import type { FillBlankBlank } from "./fill-in-the-blank.types"

type FillBlankHintProps = { blank: FillBlankBlank }

export function FillBlankHint({ blank }: FillBlankHintProps) {
  const [open, setOpen] = useState(false)
  if (!blank.hint.text && blank.hint.media.length === 0) return null
  return <Collapsible open={open} onOpenChange={setOpen}><CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" aria-label={`Lihat petunjuk untuk blank ${blank.id}`}><Lightbulb /> Lihat Petunjuk</Button></CollapsibleTrigger><CollapsibleContent className="mt-2 rounded-lg bg-muted/50 p-3 text-sm" aria-live="polite">{blank.hint.text ? <p>{blank.hint.text}</p> : null}{blank.hint.media.map((media) => <MediaViewer key={media.id} media={media} className="mt-2 max-h-48 w-full rounded-lg object-contain" />)}</CollapsibleContent></Collapsible>
}
