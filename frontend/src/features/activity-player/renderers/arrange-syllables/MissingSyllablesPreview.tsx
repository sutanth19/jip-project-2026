import { DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { Check, ChevronLeft, ChevronRight, Gamepad2, Hand, ImageOff, Lightbulb, Pause, RotateCcw, Sparkles, Star, Volume2, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { DndProvider } from "../../interactions/DndProvider"
import { DraggableLearningCard } from "../../interactions/DraggableLearningCard"
import { DroppableLearningZone } from "../../interactions/DroppableLearningZone"
import { playPickUpGameSound, playWrongGameSound } from "../../audio/gameSoundEffects"
import { VoxelGameEnvironment } from "./VoxelGameEnvironment"
import "./voxel-game.css"
import type { ArrangeSyllableUnit, ArrangeSyllablesMissingQuestion, ArrangeSyllablesSettings, MissingSyllablesState } from "./arrange-syllables.types"
import { canRetryMissingSyllables, createMissingSyllableBlankSelectHandler, isMissingSyllableChoiceCorrectForBlank, missingSyllableBlankIdFromDropTarget, missingSyllableBlanks, missingSyllableChoices, promptMedia } from "./arrange-syllables.utils"

type MissingSyllablesPreviewProps = {
  question: ArrangeSyllablesMissingQuestion
  state: MissingSyllablesState
  settings: ArrangeSyllablesSettings
  onPlace: (choiceId: string, blankId: string) => void
  onReject: () => void
  onReturn: (choiceId: string) => void
  onReset: () => void
  onRetry: () => void
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
  currentIndex: number
  itemIds: readonly string[]
  completedItemIds: ReadonlySet<string>
}

function GameButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button className={`h-11 rounded-xl border-2 font-bold shadow-[0_4px_0] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0] motion-reduce:transform-none ${className ?? ""}`} {...props} />
}

function ArrangeSyllablesMascot({ state, message }: { state: "neutral" | "correct" | "wrong"; message: string }) {
  const motionClass = state === "correct" ? "motion-safe:animate-bounce" : state === "wrong" ? "motion-safe:animate-[wiggle_0.5s_ease-in-out]" : ""

  return (
    <aside className="flex min-w-0 items-center gap-3 rounded-2xl border-4 border-sky-700 bg-sky-100 p-3 shadow-[0_5px_0_#0369a1] sm:flex-col sm:text-center">
      <div className={`size-16 shrink-0 ${motionClass}`} aria-hidden="true">
        <svg viewBox="0 0 100 100" className="size-full drop-shadow-sm">
          <rect x="15" y="20" width="70" height="65" rx="12" fill="#0284c7" stroke="#075985" strokeWidth="4" />
          <rect x="20" y="25" width="60" height="55" rx="8" fill="#38bdf8" />
          <rect x="13" y="28" width="74" height="14" rx="4" fill="#f43f5e" />
          <rect x="42" y="24" width="16" height="12" rx="2" fill="#facc15" />
          <circle cx="36" cy="53" r="9" fill="white" /><circle cx="36" cy="53" r="4" fill="#0f172a" />
          <circle cx="64" cy="53" r="9" fill="white" /><circle cx="64" cy="53" r="4" fill="#0f172a" />
          <path d={state === "correct" ? "M 32 64 Q 50 82 68 64 Z" : "M 36 68 Q 50 77 64 68"} fill={state === "correct" ? "#0f172a" : "none"} stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black tracking-wide text-sky-900">MASKOT BUBU</p>
        <p aria-live="polite" className="mt-1 rounded-xl border-2 border-sky-600 bg-white px-3 py-2 text-sm font-semibold leading-5 text-slate-800 shadow-[0_3px_0_#38bdf8]">{message}</p>
      </div>
    </aside>
  )
}

function VoxelChoiceTile({ choice, disabled, selected, onSelect }: { choice: ArrangeSyllableUnit; disabled: boolean; selected: boolean; onSelect: () => void }) {
  return (
    <DraggableLearningCard
      id={`arrange-syllable:${choice.id}`}
      disabled={disabled}
      ariaLabel={`Suku kata ${choice.value}. Tekan untuk memilih, atau seret ke ruang kosong.`}
      selected={selected}
      className="w-auto min-w-24 rounded-2xl focus-visible:ring-4 focus-visible:ring-blue-500/50"
      onSelect={() => {
        playPickUpGameSound()
        onSelect()
      }}
    >
      <Card className="border-4 border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 py-0 text-amber-950 shadow-[0_7px_0_#854d0e] transition-transform hover:-translate-y-1 dark:border-yellow-300 dark:from-yellow-300 dark:to-amber-500">
        <CardContent className="flex min-h-18 items-center justify-center px-5 py-3 text-2xl font-black tracking-wide sm:min-h-20 sm:px-7 sm:text-3xl">{choice.value}</CardContent>
      </Card>
    </DraggableLearningCard>
  )
}

function ReferenceMedia({ image, title }: { image?: ReturnType<typeof promptMedia>["image"]; title: string }) {
  if (!image?.url) {
    return <div className="flex min-h-48 items-center justify-center rounded-2xl border-4 border-amber-800 bg-amber-50 p-6 text-center text-amber-900 shadow-inner"><div><ImageOff className="mx-auto size-8" aria-hidden="true" /><p className="mt-2 text-sm font-semibold">Imej tidak ditambah</p></div></div>
  }

  return <figure className="overflow-hidden rounded-2xl border-4 border-amber-800 bg-amber-50 p-2 shadow-[0_5px_0_#78350f]">
    <img src={image.url} alt={image.altText ?? title} className="h-52 w-full rounded-xl object-contain sm:h-64" />
  </figure>
}

export function MissingSyllablesPreview({ question, state, settings, onPlace, onReject, onReturn, onReset, onRetry, onPrevious, onNext, isFirst, isLast, currentIndex, itemIds, completedItemIds }: MissingSyllablesPreviewProps) {
  const [activeChoiceId, setActiveChoiceId] = useState<string | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [rejectedDrop, setRejectedDrop] = useState<{ blankId: string; choiceId: string } | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const rejectedDropTimeout = useRef<number | null>(null)
  const dragGestureTimeout = useRef<number | null>(null)
  const dragGestureActive = useRef(false)
  const choices = useMemo(() => missingSyllableChoices(question), [question])
  const blanks = useMemo(() => missingSyllableBlanks(question), [question])
  const choicesById = useMemo(() => new Map(choices.map((choice) => [choice.id, choice])), [choices])
  const assignedChoiceIds = new Set(Object.values(state.assignments))
  const availableChoices = state.bankOrder.map((id) => choicesById.get(id)).filter((choice): choice is ArrangeSyllableUnit => choice !== undefined).filter((choice) => !assignedChoiceIds.has(choice.id))
  const activeChoice = activeChoiceId ? choicesById.get(activeChoiceId) : undefined
  const retryAllowed = canRetryMissingSyllables(state, settings)
  const { image, audio } = promptMedia(question)
  const mascotState = state.submitted && state.isCorrect ? "correct" : rejectedDrop || state.submitted && state.isCorrect === false ? "wrong" : "neutral"
  const mascotMessage = state.submitted && state.isCorrect ? "Hebat! Jawapan betul!" : rejectedDrop || state.submitted && state.isCorrect === false ? "Cuba lagi! Anda pasti boleh!" : activeChoice ? `Sekarang letakkan "${activeChoice.value}" di ruang kosong!` : "Mari lengkapkan perkataan!"

  const clearRejectedDrop = () => {
    if (rejectedDropTimeout.current !== null) window.clearTimeout(rejectedDropTimeout.current)
    rejectedDropTimeout.current = null
    setRejectedDrop(null)
  }

  const clearDragGesture = () => {
    if (dragGestureTimeout.current !== null) window.clearTimeout(dragGestureTimeout.current)
    dragGestureTimeout.current = null
    dragGestureActive.current = false
  }

  const handleChoiceSelect = (choiceId: string) => {
    if (dragGestureActive.current) return
    playPickUpGameSound()
    setActiveChoiceId(choiceId)
  }

  const handleBlankSelect = (assignedChoiceId: string | undefined, blankId: string) => {
    const handler = createMissingSyllableBlankSelectHandler({
      dragging: dragGestureActive.current,
      assignedChoiceId,
      activeChoiceId: activeChoiceId ?? undefined,
      blankId,
      onReturn,
      onPlace: place,
    })
    handler?.()
  }

  useEffect(() => () => {
    if (rejectedDropTimeout.current !== null) window.clearTimeout(rejectedDropTimeout.current)
    if (dragGestureTimeout.current !== null) window.clearTimeout(dragGestureTimeout.current)
  }, [])

  const rejectDrop = (choiceId: string, blankId: string) => {
    clearRejectedDrop()
    setActiveChoiceId(null)
    setRejectedDrop({ blankId, choiceId })
    playWrongGameSound()
    onReject()
    rejectedDropTimeout.current = window.setTimeout(() => {
      setRejectedDrop(null)
      rejectedDropTimeout.current = null
    }, 600)
  }

  const place = (choiceId: string, blankId: string) => {
    const choice = choicesById.get(choiceId)
    const blank = blanks.find((entry) => entry.id === blankId)
    if (!choice || !blank) return
    setActiveChoiceId(null)
    if (!isMissingSyllableChoiceCorrectForBlank(question, choiceId, blankId)) {
      rejectDrop(choiceId, blankId)
      return
    }
    onPlace(choiceId, blankId)
  }
  const onDragStart = (event: DragStartEvent) => {
    clearDragGesture()
    dragGestureActive.current = true
    playPickUpGameSound()
    setActiveChoiceId(String(event.active.id).replace("arrange-syllable:", ""))
  }
  const onDragEnd = (event: DragEndEvent) => {
    const choiceId = String(event.active.id).replace("arrange-syllable:", "")
    const overId = event.over ? String(event.over.id) : ""
    setActiveChoiceId(null)
    dragGestureTimeout.current = window.setTimeout(clearDragGesture, 0)
    if (!choicesById.has(choiceId)) return
    if (overId === "missing-syllable-bank") onReturn(choiceId)
    else {
      const blankId = missingSyllableBlankIdFromDropTarget(overId)
      if (blankId) place(choiceId, blankId)
    }
  }
  const onDragCancel = () => {
    setActiveChoiceId(null)
    dragGestureTimeout.current = window.setTimeout(clearDragGesture, 0)
  }
  const toggleAudio = async () => {
    const player = audioRef.current
    if (!player) return
    try {
      if (player.paused) {
        await player.play()
        setIsPlayingAudio(true)
      } else {
        player.pause()
        setIsPlayingAudio(false)
      }
    } catch {
      setIsPlayingAudio(false)
    }
  }

  return (
    <DndProvider onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
      <VoxelGameEnvironment>
      <section aria-label="Permainan Seret Suku Kata" className="relative overflow-hidden rounded-3xl border-4 border-amber-950 bg-gradient-to-b from-amber-50 via-yellow-100 to-amber-200 p-3 shadow-[0_9px_0_#3f2512,0_18px_32px_rgb(15_23_42_/_0.25)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_15%_25%,rgb(255_255_255_/_0.8)_0_9%,transparent_10%),radial-gradient(circle_at_88%_20%,rgb(255_255_255_/_0.7)_0_7%,transparent_8%)]" />
        <header className="relative flex flex-col gap-4 rounded-2xl border-4 border-amber-900 bg-gradient-to-b from-amber-900 to-stone-950 p-3 text-white shadow-[0_5px_0_#1c1917] sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-yellow-200 bg-yellow-400 text-amber-950 shadow-[0_3px_0_#a16207]"><Gamepad2 className="size-6" aria-hidden="true" /></span>
            <div className="min-w-0"><h2 className="text-xl font-black tracking-wide text-yellow-300 sm:text-2xl">Seret Suku Kata</h2><p className="text-sm font-semibold text-amber-100">Soalan {currentIndex + 1} daripada {itemIds.length}</p></div>
          </div>
          <div className="flex max-w-full gap-1.5 overflow-x-auto px-1 py-1" aria-label="Kemajuan soalan">
            {itemIds.map((itemId, index) => {
              const completed = completedItemIds.has(itemId) || (index === currentIndex && state.completed)
              const current = index === currentIndex
              return <span key={itemId} aria-current={current ? "step" : undefined} className={`flex size-9 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-black shadow-[0_3px_0] ${completed ? "border-green-100 bg-gradient-to-b from-green-400 to-green-700 text-white shadow-green-900" : current ? "scale-110 border-yellow-100 bg-gradient-to-b from-yellow-300 to-yellow-500 text-amber-950 shadow-amber-700" : "border-stone-500 bg-stone-700 text-stone-300 shadow-stone-950"}`}>{completed ? <Check className="size-4" aria-label={`Soalan ${index + 1} selesai`} /> : index + 1}</span>
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {audio ? <GameButton type="button" onClick={() => void toggleAudio()} aria-label={isPlayingAudio ? "Jeda audio soalan" : "Dengar audio soalan"} className="border-blue-200 bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-blue-950 hover:bg-blue-600">{isPlayingAudio ? <Pause /> : <Volume2 />}<span>{isPlayingAudio ? "Jeda Audio" : "Dengar Audio"}</span></GameButton> : null}
            {question.hint ? <AlertDialog><AlertDialogTrigger asChild><GameButton type="button" className="border-purple-200 bg-gradient-to-b from-purple-500 to-purple-700 text-white shadow-purple-950 hover:bg-purple-600"><Lightbulb />Petunjuk</GameButton></AlertDialogTrigger><AlertDialogContent className="border-4 border-purple-400 bg-amber-50"><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2 text-xl"><Lightbulb className="text-purple-600" />Petunjuk Soalan</AlertDialogTitle><AlertDialogDescription className="rounded-xl border border-purple-300 bg-purple-100 p-4 text-base font-medium text-purple-950">{question.hint}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction className="border-2 border-purple-200 bg-purple-600 text-white shadow-[0_3px_0_#581c87] hover:bg-purple-700">Tutup Petunjuk</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}
          </div>
        </header>

        {audio ? <audio ref={audioRef} preload="metadata" onEnded={() => setIsPlayingAudio(false)} onPause={() => setIsPlayingAudio(false)}><source src={audio.url ?? undefined} type={audio.mimeType ?? undefined} /></audio> : null}

        <div className="relative mt-5 grid items-center gap-5 lg:grid-cols-[minmax(10rem,1fr)_minmax(18rem,1.25fr)_minmax(10rem,1fr)]">
          <ArrangeSyllablesMascot state={mascotState} message={mascotMessage} />
          <ReferenceMedia image={image} title={question.title ?? "Imej rujukan soalan"} />
            {question.hint ? <div className="hidden rounded-2xl border-4 border-purple-400 bg-purple-100 p-4 shadow-[0_5px_0_#7e22ce] lg:block"><div className="flex items-center gap-2 text-purple-900"><Lightbulb className="size-5" /><p className="font-black">Petunjuk Soalan</p></div><p className="mt-2 text-sm font-medium leading-6 text-purple-950">{question.hint}</p></div> : <div className="hidden lg:block" aria-hidden="true" />}
        </div>

        <div className="relative mt-5 flex items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-yellow-200 px-4 py-3 text-center font-bold text-amber-950 shadow-sm"><Hand className="size-5 shrink-0 motion-safe:animate-bounce" aria-hidden="true" />Seret suku kata yang betul ke ruang kosong.</div>

        <section className="relative mt-5 space-y-4" aria-label="Lengkapkan perkataan">
          {question.words.map((word) => <div key={word.id} className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border-2 border-amber-900/15 bg-amber-50/70 p-4 sm:gap-4 sm:p-5">
            {word.syllables.map((syllable) => {
              if (!syllable.isMissing) return <span key={syllable.id} className="min-w-24 rounded-2xl border-4 border-blue-200 bg-gradient-to-b from-blue-500 to-blue-700 px-5 py-4 text-center text-2xl font-black tracking-wide text-white shadow-[0_7px_0_#1e3a8a] sm:min-w-28 sm:px-7 sm:text-4xl">{syllable.value}</span>
              const blankId = `${word.id}:${syllable.id}`
              const assignedChoice = choicesById.get(state.assignments[blankId] ?? "")
              const rejectedChoice = rejectedDrop?.blankId === blankId ? choicesById.get(rejectedDrop.choiceId) : undefined
              const isRejected = Boolean(rejectedChoice)
              const isCorrect = state.submitted && assignedChoice?.value.normalize("NFC") === syllable.value.normalize("NFC")
              const isWrong = state.submitted && Boolean(assignedChoice) && !isCorrect
              return <DroppableLearningZone key={blankId} id={`missing-syllable-blank:${blankId}`} label={`Ruang kosong untuk suku kata ${syllable.sequence}${assignedChoice ? `, ${assignedChoice.value}` : ""}`} disabled={state.submitted || isRejected} onSelect={assignedChoice ? () => handleBlankSelect(assignedChoice.id, blankId) : activeChoice ? () => handleBlankSelect(undefined, blankId) : undefined} activeClassName="scale-105 border-blue-500 bg-yellow-100 shadow-[0_0_24px_rgb(59_130_246_/_0.65)]" className={`flex min-h-20 min-w-34 items-center justify-center rounded-2xl border-4 p-1 text-center shadow-inner sm:min-h-24 sm:min-w-44 ${isCorrect ? "voxel-game-pop border-green-100 bg-gradient-to-b from-green-400 to-green-700 text-white shadow-[0_7px_0_#14532d]" : isRejected || isWrong ? "voxel-game-shake border-red-400 bg-red-100 text-red-900" : "border-dashed border-amber-500 bg-amber-100 text-amber-800 hover:border-blue-500 hover:bg-yellow-100"}`}>
                {isRejected && rejectedChoice ? <span role="status" aria-live="polite" className="flex flex-col items-center gap-1 px-3 text-sm font-black"><span className="flex items-center gap-2 text-2xl"><X className="size-6" aria-hidden="true" />{rejectedChoice.value}</span><span>Cuba lagi</span></span> : assignedChoice ? <button type="button" onClick={() => onReturn(assignedChoice.id)} className="flex min-h-16 min-w-28 items-center justify-center rounded-xl px-4 text-2xl font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 sm:text-3xl" aria-label={`Kembalikan suku kata ${assignedChoice.value} ke pilihan`}>{assignedChoice.value}{isCorrect ? <Check className="ml-2 size-5" /> : null}{isWrong ? <X className="ml-2 size-5" /> : null}</button> : <span className="px-3 text-sm font-bold italic">Letak di sini</span>}
              </DroppableLearningZone>
            })}
          </div>)}
        </section>

        {state.validationError ? <p role="alert" className="relative mt-4 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-800">Sila lengkapkan semua ruang kosong.</p> : null}
        {state.submitted && state.feedback ? <p role="status" aria-live="polite" className={`relative mt-4 rounded-xl border-2 px-4 py-3 text-center font-bold ${state.isCorrect ? "border-green-300 bg-green-100 text-green-900" : "border-red-300 bg-red-100 text-red-900"}`}>{state.isCorrect ? <Sparkles className="mr-2 inline size-5" /> : null}{state.feedback}</p> : null}

        <DroppableLearningZone id="missing-syllable-bank" label="Pilihan suku kata. Seret pilihan kembali ke sini untuk mengosongkan jawapan." disabled={state.submitted} className="relative mt-5 rounded-2xl border-2 border-amber-900/20 bg-amber-50/70 p-4">
          <p className="text-center text-xs font-black tracking-widest text-amber-900/80">PILIHAN JAWAPAN</p>
          {availableChoices.length === 0 ? <p className="mt-4 text-center text-sm font-medium text-muted-foreground">Semua pilihan telah digunakan.</p> : <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6">{availableChoices.map((choice) => <VoxelChoiceTile key={choice.id} choice={choice} disabled={state.submitted} selected={activeChoiceId === choice.id} onSelect={() => handleChoiceSelect(choice.id)} />)}</div>}
        </DroppableLearningZone>

        <footer className="relative mt-5 flex flex-col gap-4 border-t-2 border-amber-900/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <GameButton type="button" variant="outline" disabled={isFirst} onClick={() => { clearRejectedDrop(); setActiveChoiceId(null); onPrevious() }} className="border-blue-200 bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-blue-950 hover:bg-blue-600"><ChevronLeft />Sebelumnya</GameButton>
          <div className="flex flex-wrap items-center justify-center gap-3"><span className="inline-flex h-11 items-center gap-1 rounded-xl border-2 border-yellow-400 bg-yellow-100 px-4 font-black text-yellow-900 shadow-inner"><Star className="size-5 fill-current" />{completedItemIds.size + (state.completed && !completedItemIds.has(question.itemId) ? 1 : 0)}</span>{!state.submitted ? <GameButton type="button" variant="outline" disabled={Object.keys(state.assignments).length === 0} onClick={() => { clearRejectedDrop(); setActiveChoiceId(null); onReset() }} className="border-orange-200 bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-orange-950 hover:bg-orange-600"><RotateCcw />Cuba Semula</GameButton> : null}{retryAllowed ? <GameButton type="button" onClick={() => { clearRejectedDrop(); setActiveChoiceId(null); onRetry() }} className="border-orange-200 bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-orange-950 hover:bg-orange-600"><RotateCcw />Cuba Lagi</GameButton> : null}</div>
          <GameButton type="button" disabled={!state.completed} onClick={() => { clearRejectedDrop(); setActiveChoiceId(null); onNext() }} className="border-green-200 bg-gradient-to-b from-green-500 to-green-700 text-white shadow-green-950 hover:bg-green-600">{isLast ? "Selesai" : "Seterusnya"}<ChevronRight /></GameButton>
        </footer>
      </section>
      </VoxelGameEnvironment>
      <DragOverlay dropAnimation={null}>{activeChoice ? <Card className="min-w-24 rotate-3 border-4 border-blue-200 bg-gradient-to-b from-yellow-300 to-amber-500 py-0 text-amber-950 opacity-95 shadow-[0_12px_0_#854d0e,0_0_0_4px_rgb(96_165_250_/_0.8)]"><CardContent className="flex min-h-20 items-center justify-center px-7 text-3xl font-black">{activeChoice.value}</CardContent></Card> : null}</DragOverlay>
    </DndProvider>
  )
}
