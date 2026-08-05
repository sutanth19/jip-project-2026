import { Lightbulb } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { MediaViewer } from "../../components/MediaViewer"
import type { WordBuilderQuestion } from "./word-builder.types"

type WordBuilderHintProps = { question: WordBuilderQuestion }

export function WordBuilderHint({ question }: WordBuilderHintProps) {
  const [open, setOpen] = useState(false)
  if (question.hint === "NONE") return null
  const promptMedia = question.prompt?.media
  const content = question.hint === "FIRST_UNIT" ? <p className="text-sm text-muted-foreground">Perkataan bermula dengan: <span className="font-semibold text-foreground">{question.targetUnits[0]?.value}</span></p> : question.hint === "FIRST_TWO_UNITS" ? <p className="text-sm text-muted-foreground">Dua unit pertama: <span className="font-semibold text-foreground">{question.targetUnits.slice(0, 2).map((unit) => unit.value).join(" ")}</span></p> : promptMedia ? <MediaViewer media={promptMedia} /> : null
  if (!content) return null
  return <Collapsible open={open} onOpenChange={setOpen}><CollapsibleTrigger asChild><Button type="button" variant="outline" className="h-11"><Lightbulb />{open ? "Sembunyikan petunjuk" : "Lihat petunjuk"}</Button></CollapsibleTrigger><CollapsibleContent className="mt-3 rounded-xl bg-muted/30 p-3" aria-live="polite">{content}</CollapsibleContent></Collapsible>
}
