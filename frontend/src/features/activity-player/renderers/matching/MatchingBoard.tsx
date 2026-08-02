import { ChevronLeft, ChevronRight, RotateCcw, Send } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getMediaKind } from "../../activity-player.utils"
import { MediaViewer } from "../../components/MediaViewer"
import type { PairingOption } from "../../interactions/pairing.types"
import { canRetryPairing } from "../../interactions/pairing.utils"
import { MatchingFeedback } from "./MatchingFeedback"
import { MatchingItemCard } from "./MatchingItemCard"
import type { MatchingQuestion, MatchingSettings, MatchingState } from "./matching.types"

type MatchingBoardProps = {
  question: MatchingQuestion
  state: MatchingState
  settings: MatchingSettings
  onAssign: (leftId: string, rightId: string) => void
  onReset: () => void
  onSubmit: () => void
  onRetry: () => void
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
}

function resultFor(optionId: string, side: "left" | "right", question: MatchingQuestion, state: MatchingState, settings: MatchingSettings): "neutral" | "correct" | "incorrect" {
  if (!state.submitted || !settings.showImmediateFeedback) return "neutral"
  const pair = side === "left" ? question.pairs.find((entry) => entry.left.id === optionId) : question.pairs.find((entry) => entry.right.id === optionId)
  if (!pair) return "neutral"
  const assignedRightId = state.assignments[pair.left.id]
  if (!assignedRightId) return "neutral"
  return assignedRightId === pair.correctRightId ? "correct" : "incorrect"
}

export function MatchingBoard({ question, state, settings, onAssign, onReset, onSubmit, onRetry, onPrevious, onNext, isFirst, isLast }: MatchingBoardProps) {
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null)
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null)
  const image = question.media.find((media) => getMediaKind(media) === "image")
  const audio = question.media.find((media) => getMediaKind(media) === "audio")
  const leftById = new Map(question.pairs.map((pair) => [pair.left.id, pair.left]))
  const rightById = new Map(question.pairs.map((pair) => [pair.right.id, pair.right]))
  const matchedLeftIds = new Set(Object.keys(state.assignments))
  const matchedRightIds = new Set(Object.values(state.assignments))
  const retryAllowed = canRetryPairing(state, settings)
  const chooseLeft = (leftId: string) => {
    if (state.submitted) return
    setSelectedLeftId(leftId)
    if (selectedRightId) {
      onAssign(leftId, selectedRightId)
      setSelectedLeftId(null)
      setSelectedRightId(null)
    }
  }
  const chooseRight = (rightId: string) => {
    if (state.submitted) return
    setSelectedRightId(rightId)
    if (selectedLeftId) {
      onAssign(selectedLeftId, rightId)
      setSelectedLeftId(null)
      setSelectedRightId(null)
    }
  }
  const reset = () => { setSelectedLeftId(null); setSelectedRightId(null); onReset() }
  const retry = () => { setSelectedLeftId(null); setSelectedRightId(null); onRetry() }
  const orderedLeft = state.leftOrder.map((id) => leftById.get(id)).filter((option): option is PairingOption => Boolean(option))
  const orderedRight = state.rightOrder.map((id) => rightById.get(id)).filter((option): option is PairingOption => Boolean(option))

  return <Card className="border-border/80 shadow-sm"><CardHeader className="space-y-3"><p className="text-sm font-semibold text-primary">Padankan item kiri dengan item kanan</p><CardTitle className="text-xl leading-snug sm:text-2xl">{question.title ?? question.prompt}</CardTitle>{question.title ? <p className="text-base leading-7 text-foreground sm:text-lg">{question.prompt}</p> : null}{question.instructions ? <p className="text-sm leading-6 text-muted-foreground">{question.instructions}</p> : null}</CardHeader><CardContent className="space-y-5">{image ? <MediaViewer media={image} className="max-h-80 w-full rounded-2xl object-contain" /> : null}{audio ? <MediaViewer media={audio} /> : null}<p className="sr-only" aria-live="polite">{selectedLeftId ? "Item kiri dipilih. Pilih item kanan untuk membentuk padanan." : selectedRightId ? "Item kanan dipilih. Pilih item kiri untuk membentuk padanan." : `${matchedLeftIds.size} daripada ${state.requiredCount} padanan dibentuk.`}</p><div className="grid gap-5 lg:grid-cols-2"><section aria-label="Item kiri" className="space-y-3"><h3 className="font-semibold">Pilih item kiri</h3>{orderedLeft.map((option) => <MatchingItemCard key={option.id} option={option} side="left" selected={selectedLeftId === option.id} matched={matchedLeftIds.has(option.id)} result={resultFor(option.id, "left", question, state, settings)} disabled={state.submitted} onSelect={() => chooseLeft(option.id)} />)}</section><section aria-label="Item kanan" className="space-y-3"><h3 className="font-semibold">Kemudian pilih item kanan</h3>{orderedRight.map((option) => <MatchingItemCard key={option.id} option={option} side="right" selected={selectedRightId === option.id} matched={matchedRightIds.has(option.id)} result={resultFor(option.id, "right", question, state, settings)} disabled={state.submitted} onSelect={() => chooseRight(option.id)} />)}</section></div><MatchingFeedback submitted={state.submitted} isCorrect={state.isCorrect} message={state.feedback} explanation={question.explanation} showExplanation={settings.showExplanation} showImmediateFeedback={settings.showImmediateFeedback} /><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><Button type="button" variant="outline" className="h-11 min-w-28" disabled={isFirst} onClick={onPrevious}><ChevronLeft /> Sebelum</Button><div className="flex flex-wrap gap-2">{!state.submitted ? <><Button type="button" variant="outline" className="h-11" disabled={matchedLeftIds.size === 0} onClick={reset}><RotateCcw /> Set semula</Button><Button type="button" className="h-11 min-w-36" disabled={matchedLeftIds.size !== state.requiredCount} onClick={onSubmit}><Send /> Semak jawapan</Button></> : null}{retryAllowed ? <Button type="button" variant="outline" className="h-11" onClick={retry}>Cuba lagi</Button> : null}{state.completed ? <Button type="button" className="h-11 min-w-28" onClick={onNext}>{isLast ? "Selesai" : "Seterusnya"}<ChevronRight /></Button> : null}</div></div></CardContent></Card>
}
