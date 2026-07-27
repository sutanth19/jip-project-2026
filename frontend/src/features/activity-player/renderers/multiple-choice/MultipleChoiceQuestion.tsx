import { ChevronLeft, ChevronRight, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup } from "@/components/ui/radio-group"

import { getMediaKind } from "../../activity-player.utils"
import { MediaViewer } from "../../components/MediaViewer"
import type { MultipleChoiceQuestionModel, MultipleChoiceQuestionState, MultipleChoiceSettings } from "./multiple-choice.types"
import { canRetryQuestion } from "./multiple-choice.utils"
import { MultipleChoiceFeedback } from "./MultipleChoiceFeedback"
import { MultipleChoiceOption } from "./MultipleChoiceOption"

type MultipleChoiceQuestionProps = {
  question: MultipleChoiceQuestionModel
  state: MultipleChoiceQuestionState
  settings: MultipleChoiceSettings
  options: MultipleChoiceQuestionModel["options"]
  onSelect: (optionId: string) => void
  onSubmit: () => void
  onRetry: () => void
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
}

function optionStatus(optionId: string, question: MultipleChoiceQuestionModel, state: MultipleChoiceQuestionState, settings: MultipleChoiceSettings): "neutral" | "correct" | "incorrect" {
  if (!state.submitted || !settings.showImmediateFeedback) return "neutral"
  if (state.isCorrect && question.correctOptionIds.has(optionId)) return "correct"
  if (settings.revealCorrectAnswer && question.correctOptionIds.has(optionId)) return "correct"
  if (state.selectedOptionIds.includes(optionId)) return "incorrect"
  return "neutral"
}

export function MultipleChoiceQuestion({ question, state, settings, options, onSelect, onSubmit, onRetry, onPrevious, onNext, isFirst, isLast }: MultipleChoiceQuestionProps) {
  const image = question.media.find((media) => getMediaKind(media) === "image")
  const audio = question.media.find((media) => getMediaKind(media) === "audio")
  const retryAllowed = canRetryQuestion(state, settings)
  const optionsContent = options.map((option) => <MultipleChoiceOption key={option.id} option={option} mode={question.mode} selected={state.selectedOptionIds.includes(option.id)} disabled={state.submitted} status={optionStatus(option.id, question, state, settings)} onSelect={onSelect} />)

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-3"><p className="text-sm font-semibold text-primary">{question.mode === "SINGLE_CHOICE" ? "Pilih satu jawapan" : "Pilih semua jawapan yang betul"}</p><CardTitle className="text-xl leading-snug sm:text-2xl">{question.title ?? question.question}</CardTitle>{question.title ? <p className="text-base leading-7 text-foreground sm:text-lg">{question.question}</p> : null}{question.instructions ? <p className="text-sm leading-6 text-muted-foreground">{question.instructions}</p> : null}</CardHeader>
      <CardContent className="space-y-5"><div className="space-y-4">{image ? <MediaViewer media={image} className="max-h-80 w-full rounded-2xl object-contain" /> : null}{audio ? <MediaViewer media={audio} /> : null}{question.media.length > 0 && !image && !audio ? <MediaViewer /> : null}</div><div className={options.some((option) => option.media.length > 0 || option.content.length < 24) ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4" : "grid gap-3 sm:grid-cols-2"} aria-label="Pilihan jawapan">{question.mode === "SINGLE_CHOICE" ? <RadioGroup value={state.selectedOptionIds[0] ?? ""} onValueChange={onSelect} aria-label="Pilih satu jawapan" className="contents">{optionsContent}</RadioGroup> : <div role="group" aria-label="Pilih semua jawapan yang betul" className="contents">{optionsContent}</div>}</div><MultipleChoiceFeedback submitted={state.submitted} isCorrect={state.isCorrect} message={state.feedback} explanation={question.explanation} showExplanation={settings.showExplanation} showImmediateFeedback={settings.showImmediateFeedback} /><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><Button type="button" variant="outline" className="h-11 min-w-28" disabled={isFirst} onClick={onPrevious}><ChevronLeft /> Sebelum</Button><div className="flex flex-wrap gap-2">{!state.submitted ? <Button type="button" className="h-11 min-w-32" disabled={state.selectedOptionIds.length === 0} onClick={onSubmit}><Send /> Semak jawapan</Button> : null}{retryAllowed ? <Button type="button" variant="outline" className="h-11" onClick={onRetry}>Cuba lagi</Button> : null}{state.completed ? <Button type="button" className="h-11 min-w-28" onClick={onNext}>{isLast ? "Selesai" : "Seterusnya"}<ChevronRight /></Button> : null}</div></div></CardContent>
    </Card>
  )
}
