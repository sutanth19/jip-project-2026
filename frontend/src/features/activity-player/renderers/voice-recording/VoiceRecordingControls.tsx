import { Mic, MicOff, RotateCcw, Send, Square } from "lucide-react"

import { Button } from "@/components/ui/button"

type Props = {
  recording: boolean
  canRecord: boolean
  canStop: boolean
  canSubmit: boolean
  canReRecord: boolean
  isSupported: boolean
  onRequestPermission: () => void
  onStart: () => void
  onStop: () => void
  onSubmit: () => void
  onReset: () => void
  onReRecord: () => void
}

export function VoiceRecordingControls({ recording, canRecord, canStop, canSubmit, canReRecord, isSupported, onRequestPermission, onStart, onStop, onSubmit, onReset, onReRecord }: Props) {
  if (!isSupported) return null
  return (
    <div className="flex flex-wrap gap-2">
      {!recording ? <Button type="button" className="h-11" onClick={canRecord ? onStart : onRequestPermission}><Mic className="size-4" />{canRecord ? "Mula Rakaman" : "Benarkan Mikrofon"}</Button> : <Button type="button" variant="destructive" className="h-11" onClick={onStop} disabled={!canStop}><Square className="size-4" /> Henti Rakaman</Button>}
      <Button type="button" variant="outline" className="h-11" onClick={onReset}><MicOff className="size-4" /> Reset</Button>
      {canReRecord ? <Button type="button" variant="outline" className="h-11" onClick={onReRecord}><RotateCcw className="size-4" /> Rakam Semula</Button> : null}
      <Button type="button" className="h-11" onClick={onSubmit} disabled={!canSubmit}><Send className="size-4" /> Semak Rakaman</Button>
    </div>
  )
}

