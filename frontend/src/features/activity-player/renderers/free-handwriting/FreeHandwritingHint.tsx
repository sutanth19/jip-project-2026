import { Lightbulb } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { MediaViewer } from "../../components/MediaViewer"
import type { FreeHandwritingQuestion } from "./free-handwriting.types"

type FreeHandwritingHintProps = {
  question: FreeHandwritingQuestion
  onShowPrompt: (value: boolean) => void
  onShowImage: (value: boolean) => void
  onShowLines: (value: boolean) => void
  onShowArea: (value: boolean) => void
}

export function FreeHandwritingHint({ question, onShowPrompt, onShowImage, onShowLines, onShowArea }: FreeHandwritingHintProps) {
  const [open, setOpen] = useState(false)
  if (question.hintType === "NONE") return null

  const change = (value: boolean) => {
    setOpen(value)
    onShowPrompt(question.hintType === "SHOW_PROMPT" && value)
    onShowImage(question.hintType === "SHOW_PROMPT_IMAGE" && value)
    onShowLines(question.hintType === "SHOW_WRITING_LINES" && value)
    onShowArea(question.hintType === "EMPHASIZE_WRITING_AREA" && value)
  }

  const content = question.hintType === "SHOW_PROMPT"
    ? <p className="text-sm text-muted-foreground">Baca prompt dengan teliti sebelum menulis jawapan anda.</p>
    : question.hintType === "PLAY_PROMPT_AUDIO"
      ? question.hintMedia[0] ? <MediaViewer media={question.hintMedia[0]} /> : <p className="text-sm text-muted-foreground">Audio prompt tidak tersedia.</p>
      : question.hintType === "SHOW_PROMPT_IMAGE"
        ? question.hintMedia[0] ? <MediaViewer media={question.hintMedia[0]} className="max-h-72 w-full rounded-2xl object-contain" /> : <p className="text-sm text-muted-foreground">Imej prompt tidak tersedia.</p>
        : question.hintType === "SHOW_WRITING_LINES"
          ? <p className="text-sm text-muted-foreground">Perhatikan garisan panduan untuk membantu kedudukan tulisan anda.</p>
          : <p className="text-sm text-muted-foreground">Fokus pada kawasan tulisan yang diserlahkan untuk menulis jawapan anda.</p>

  return (
    <Collapsible open={open} onOpenChange={change}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="outline" className="h-11">
          <Lightbulb />
          {open ? "Sembunyikan petunjuk" : "Lihat petunjuk"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 rounded-xl bg-muted/30 p-3" aria-live="polite">
        {content}
      </CollapsibleContent>
    </Collapsible>
  )
}
