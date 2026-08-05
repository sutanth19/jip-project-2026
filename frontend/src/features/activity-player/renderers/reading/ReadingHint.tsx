import { Lightbulb } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MediaViewer } from "../../components/MediaViewer"
import type { ReadingQuestion } from "./reading.types"

export function ReadingHint({ question, onHighlightText, onShowFirstParagraph }: { question: ReadingQuestion; onHighlightText: (value: boolean) => void; onShowFirstParagraph: (value: boolean) => void; onAudioStart: () => void }) {
  const [open, setOpen] = useState(false)
  if (question.hintType === "NONE") return null
  const change = (value: boolean) => { setOpen(value); onHighlightText(question.hintType === "HIGHLIGHT_TEXT" && value); onShowFirstParagraph(question.hintType === "SHOW_FIRST_PARAGRAPH" && value) }
  const content = question.hintType === "PLAY_AUDIO" ? question.hintMedia[0] || question.media.audio[0] ? <MediaViewer media={question.hintMedia[0] ?? question.media.audio[0]} /> : <p className="text-sm text-muted-foreground">Audio petunjuk tidak tersedia.</p> : question.hintType === "HIGHLIGHT_TEXT" ? <p className="text-sm text-muted-foreground">Tumpukan perhatian pada teks yang sedang diserlahkan.</p> : <p className="text-sm text-muted-foreground">Mulakan dengan perenggan pertama yang diserlahkan.</p>
  return <Collapsible open={open} onOpenChange={change}><CollapsibleTrigger asChild><Button type="button" variant="outline" className="h-11"><Lightbulb />{open ? "Sembunyikan petunjuk" : "Lihat petunjuk"}</Button></CollapsibleTrigger><CollapsibleContent className="mt-3 rounded-xl bg-muted/30 p-3" aria-live="polite">{content}</CollapsibleContent></Collapsible>
}
