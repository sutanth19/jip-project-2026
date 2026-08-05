import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { MediaViewer } from "../../components/MediaViewer"
import type { FreeHandwritingQuestion } from "./free-handwriting.types"
import { freeHandwritingResponseLabel } from "./free-handwriting.utils"

type FreeHandwritingPromptProps = { question: FreeHandwritingQuestion; emphasizedPrompt: boolean; emphasizedImage: boolean }

export function FreeHandwritingPrompt({ question, emphasizedPrompt, emphasizedImage }: FreeHandwritingPromptProps) {
  const primaryPromptMedia = question.promptMedia
  const supportingMedia = question.supportingMedia

  return (
    <Card className={emphasizedPrompt ? "border-primary/50 bg-primary/5" : undefined}>
      <CardHeader className="space-y-2">
        <p className="text-sm font-semibold text-primary">{freeHandwritingResponseLabel(question.responseMode)}</p>
        <CardTitle className="text-xl sm:text-2xl">Tulis jawapan anda berdasarkan prompt</CardTitle>
        {question.instructions ? <p className="text-sm leading-6 text-muted-foreground">{question.instructions}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {question.showPromptText && question.promptText ? <p className="text-base leading-7 text-foreground">{question.promptText}</p> : null}
        {question.instructionAudio.map((media) => <MediaViewer key={media.id} media={media} />)}
        {primaryPromptMedia.map((media) => <MediaViewer key={media.id} media={media} className={emphasizedImage && media.mimeType?.startsWith("image/") ? "max-h-80 w-full rounded-2xl object-contain ring-4 ring-primary/30" : "max-h-80 w-full rounded-2xl object-contain"} />)}
        {supportingMedia.map((media) => <MediaViewer key={media.id} media={media} />)}
      </CardContent>
    </Card>
  )
}
