import { Card, CardContent } from "@/components/ui/card"

import { MediaViewer } from "../../components/MediaViewer"
import type { CopyWritingQuestion } from "./copy-writing.types"

type CopyWritingReferenceProps = { question: CopyWritingQuestion; emphasized?: boolean; repeat?: boolean }

export function CopyWritingReference({ question, emphasized = false, repeat = false }: CopyWritingReferenceProps) {
  const text = question.referenceDisplay.showSyllableBreaks ? question.syllableUnits.map((unit) => unit.value).join(question.referenceDisplay.syllableSeparator) : question.referenceText
  const copies = repeat ? Math.min(question.repetitionCount, question.writingLayout.lineCount) : 1
  return <div className="space-y-3" aria-label="Teks rujukan"><Card className={emphasized ? "border-primary bg-primary/5" : undefined}><CardContent className="space-y-3 p-4">{Array.from({ length: copies }, (_, index) => <p key={index} className="break-words font-semibold leading-relaxed text-foreground" style={{ fontSize: `${Math.min(question.referenceDisplay.fontSize, 48)}px` }}>{text}</p>)}{question.media.referenceImage.map((media) => <MediaViewer key={media.id} media={media} className="max-h-56 w-full rounded-xl object-contain" />)}{question.media.referenceAudio.map((media) => <MediaViewer key={media.id} media={media} />)}</CardContent></Card></div>
}
