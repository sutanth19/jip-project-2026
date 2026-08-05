import { FileText, ImageOff, Sparkles, Video } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { getMediaKind } from "../activity-player.utils"
import type { ActivityMedia } from "../types"

type MediaViewerProps = { media?: ActivityMedia; className?: string }

export function MediaViewer({ media, className }: MediaViewerProps) {
  if (!media?.url) {
    return (
      <Card className={className}>
        <CardContent className="flex min-h-36 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <ImageOff className="size-7" aria-hidden="true" />
          <p className="text-sm">Media tidak tersedia untuk aktiviti ini.</p>
        </CardContent>
      </Card>
    )
  }

  const kind = getMediaKind(media)
  const label = media.altText ?? media.label ?? "Media aktiviti"

  if (kind === "image") return <img src={media.url} alt={label} className={className ?? "max-h-80 w-full rounded-2xl object-contain"} />
  if (kind === "audio") return <audio className={className ?? "w-full"} controls preload="metadata" aria-label={label} onPlay={(event) => { document.querySelectorAll("audio").forEach((player) => { if (player !== event.currentTarget) player.pause() }) }}><source src={media.url} type={media.mimeType ?? undefined} />Pelayar anda tidak menyokong audio.</audio>
  if (kind === "video") return <video className={className ?? "max-h-80 w-full rounded-2xl"} controls preload="metadata" aria-label={label}><source src={media.url} type={media.mimeType ?? undefined} />Pelayar anda tidak menyokong video.</video>
  if (kind === "pdf") return <Card className={className}><CardContent className="flex min-h-36 flex-col items-center justify-center gap-3 text-center"><FileText className="size-8 text-primary" aria-hidden="true" /><p className="text-sm text-muted-foreground">Pratonton PDF akan tersedia dalam pemain seterusnya.</p><Button asChild variant="outline"><a href={media.url} target="_blank" rel="noreferrer">Buka PDF</a></Button></CardContent></Card>
  if (kind === "animation") return <Card className={className}><CardContent className="flex min-h-36 flex-col items-center justify-center gap-2 text-center"><Sparkles className="size-8 text-primary" aria-hidden="true" /><p className="text-sm text-muted-foreground">Animasi akan disokong dalam fasa akan datang.</p></CardContent></Card>

  return <Card className={className}><CardContent className="flex min-h-36 flex-col items-center justify-center gap-2 text-center"><Video className="size-8 text-muted-foreground" aria-hidden="true" /><p className="text-sm text-muted-foreground">Jenis media ini tidak disokong.</p></CardContent></Card>
}
