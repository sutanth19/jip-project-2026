import { Lightbulb } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { MediaViewer } from "../../components/MediaViewer"
import type { CopyWritingQuestion } from "./copy-writing.types"

type CopyWritingHintProps = { question: CopyWritingQuestion; onShowReference: (value: boolean) => void; onShowLines: (value: boolean) => void }

function firstGrapheme(value: string): string { return typeof Intl.Segmenter === "function" ? [...new Intl.Segmenter("ms-MY", { granularity: "grapheme" }).segment(value)][0]?.segment ?? "" : Array.from(value.normalize("NFC"))[0] ?? "" }

export function CopyWritingHint({ question, onShowReference, onShowLines }: CopyWritingHintProps) {
  const [open, setOpen] = useState(false)
  if (question.hintType === "NONE") return null
  const content = question.hintType === "SHOW_REFERENCE" ? <p className="text-sm text-muted-foreground">Lihat teks rujukan dengan teliti sebelum menulis.</p> : question.hintType === "EMPHASIZE_FIRST_CHARACTER" ? <p className="text-sm text-muted-foreground">Mulakan dengan: <span className="font-semibold text-foreground">{firstGrapheme(question.referenceText)}</span></p> : question.hintType === "PLAY_REFERENCE_AUDIO" ? question.hintMedia[0] ? <MediaViewer media={question.hintMedia[0]} /> : <p className="text-sm text-muted-foreground">Audio rujukan tidak tersedia.</p> : <p className="text-sm text-muted-foreground">Perhatikan garisan tulisan untuk membantu kedudukan huruf.</p>
  const change = (value: boolean) => { setOpen(value); onShowReference(question.hintType === "SHOW_REFERENCE" && value); onShowLines(question.hintType === "SHOW_WRITING_LINES" && value) }
  return <Collapsible open={open} onOpenChange={change}><CollapsibleTrigger asChild><Button type="button" variant="outline" className="h-11"><Lightbulb />{open ? "Sembunyikan petunjuk" : "Lihat petunjuk"}</Button></CollapsibleTrigger><CollapsibleContent className="mt-3 rounded-xl bg-muted/30 p-3" aria-live="polite">{content}</CollapsibleContent></Collapsible>
}
