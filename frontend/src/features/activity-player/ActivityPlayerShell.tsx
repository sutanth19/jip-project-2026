import { ListChecks } from "lucide-react"

import { Button } from "@/components/ui/button"

import { findActivityMedia } from "./activity-player.utils"
import { useActivityPlayer } from "./ActivityContext"
import { ActivityRenderer } from "./ActivityRenderer"
import { ActivityFooter } from "./components/ActivityFooter"
import { ActivityHeader } from "./components/ActivityHeader"
import { CompletionScreen } from "./components/CompletionScreen"
import { EmptyActivity } from "./components/EmptyActivity"
import { InstructionPanel } from "./components/InstructionPanel"
import { MediaViewer } from "./components/MediaViewer"
import { ProgressBar } from "./components/ProgressBar"

type ActivityPlayerShellProps = { onExit: () => void }

export function ActivityPlayerShell({ onExit }: ActivityPlayerShellProps) {
  const { activity, items, currentIndex, goToItem, isFinished, progress } = useActivityPlayer()
  const image = findActivityMedia(activity.media, ["COVER_IMAGE", "INSTRUCTION_IMAGE"])
  const audio = findActivityMedia(activity.media, ["INSTRUCTION_AUDIO", "BACKGROUND_AUDIO", "REFERENCE_AUDIO"])
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.()
    else await document.exitFullscreen?.()
  }

  return (
    <main className="flex min-h-dvh flex-col bg-muted/30 text-foreground">
      <ActivityHeader onExit={onExit} onToggleFullscreen={() => { void toggleFullscreen() }} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        {isFinished ? <CompletionScreen onExit={onExit} /> : items.length === 0 ? <EmptyActivity /> : <>
          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><ProgressBar value={progress.percentage} label={`Kemajuan: ${progress.completed} daripada ${progress.total} item selesai`} className="w-full" /><p className="shrink-0 text-sm font-semibold">Item {progress.current} / {progress.total}</p></div>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Lompat ke item">{items.map((item, index) => <Button key={item.id} type="button" size="icon" variant={index === currentIndex ? "default" : "outline"} className="size-10" aria-label={`Pergi ke item ${index + 1}`} aria-current={index === currentIndex ? "step" : undefined} onClick={() => goToItem(index)}>{index + 1}</Button>)}</div>
          </section>
          <InstructionPanel instructions={activity.instructions} />
          {image ? <MediaViewer media={image} className="max-h-80 w-full rounded-2xl object-contain" /> : null}
          {audio ? <MediaViewer media={audio} /> : null}
          <section aria-label="Kandungan aktiviti" className="min-h-0"><ActivityRenderer /></section>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><ListChecks className="size-4" aria-hidden="true" /> Navigasi menggunakan butang, nombor item, atau kekunci Tab dan Enter.</div>
        </>}
      </div>
      {!isFinished && items.length > 0 && activity.template.rendererKey !== "multiple-choice" ? <ActivityFooter /> : null}
    </main>
  )
}
