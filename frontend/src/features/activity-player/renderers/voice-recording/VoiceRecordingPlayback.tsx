import { Button } from "@/components/ui/button"

type Props = {
  url: string | null
  canPlayback: boolean
  onDelete: () => void
}

export function VoiceRecordingPlayback({ url, canPlayback, onDelete }: Props) {
  if (!url) return null
  return (
    <div className="space-y-3">
      <audio className="w-full" controls preload="metadata">
        <source src={url} type="audio/webm" />
        Pelayar anda tidak menyokong audio.
      </audio>
      {canPlayback ? <Button type="button" variant="outline" onClick={onDelete}>Padam rakaman</Button> : null}
    </div>
  )
}

