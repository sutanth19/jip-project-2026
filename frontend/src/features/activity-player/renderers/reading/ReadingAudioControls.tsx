import { Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import type { ActivityMedia } from "../../types"

type Props = { media?: ActivityMedia; showPlayAudio: boolean; showReplay: boolean; showPause: boolean; onAudioStart?: () => void }

export function ReadingAudioControls({ media, showPlayAudio, showReplay, showPause, onAudioStart }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    const play = () => { document.querySelectorAll("audio").forEach((player) => { if (player !== audio) player.pause() }); setPlaying(true); onAudioStart?.() }
    const pause = () => setPlaying(false)
    audio.addEventListener("play", play)
    audio.addEventListener("pause", pause)
    audio.addEventListener("ended", pause)
    return () => { audio.removeEventListener("play", play); audio.removeEventListener("pause", pause); audio.removeEventListener("ended", pause) }
  }, [onAudioStart])
  if (!media?.url) return null
  return <div className="space-y-3 rounded-xl border bg-card p-4"><audio ref={ref} controls className="w-full" preload="metadata" aria-label={media.altText ?? media.label ?? "Audio bacaan"}><source src={media.url} type={media.mimeType ?? undefined} />Pelayar anda tidak menyokong audio.</audio><div className="flex flex-wrap gap-2">{showPlayAudio ? <Button type="button" variant="outline" className="h-11" onClick={() => { void ref.current?.play() }}><Play /> Main audio</Button> : null}{showPause ? <Button type="button" variant="outline" className="h-11" disabled={!playing} onClick={() => ref.current?.pause()}><Pause /> Jeda audio</Button> : null}{showReplay ? <Button type="button" variant="outline" className="h-11" onClick={() => { if (!ref.current) return; ref.current.currentTime = 0; void ref.current.play() }}><RotateCcw /> Ulang audio</Button> : null}</div></div>
}
