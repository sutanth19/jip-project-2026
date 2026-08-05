import { AlertCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { MediaViewer } from "../../components/MediaViewer"
import type { VoiceRecordingQuestion } from "./voice-recording.types"

type Props = {
  question: VoiceRecordingQuestion
}

export function VoiceRecordingPrompt({ question }: Props) {
  return (
    <Card className="border-border/80">
      <CardHeader className="space-y-2">
        <p className="text-sm font-semibold text-primary">Dengar dan rakam suara anda</p>
        <CardTitle className="text-xl leading-snug sm:text-2xl">{question.prompt.title ?? "Rakaman suara"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base leading-7 text-foreground">{question.prompt.content}</p>
        {question.instructions ? <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{question.instructions}</p> : null}
        {question.prompt.media.map((media) => <MediaViewer key={media.id} media={media} className="max-h-80 w-full rounded-2xl object-contain" />)}
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p>Rakaman hanya disimpan secara setempat dalam sesi ini. Ia tidak dimuat naik atau dinilai secara automatik.</p>
        </div>
      </CardContent>
    </Card>
  )
}

