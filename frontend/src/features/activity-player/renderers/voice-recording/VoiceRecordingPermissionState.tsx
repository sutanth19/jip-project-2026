import { MicOff, ShieldAlert, ShieldCheck } from "lucide-react"

type Props = {
  status: "idle" | "prompting" | "granted" | "denied" | "unsupported" | "busy" | "error"
}

export function VoiceRecordingPermissionState({ status }: Props) {
  if (status === "granted") return <div className="flex items-center gap-2 rounded-xl border border-secondary/40 bg-secondary/10 p-3 text-sm text-foreground"><ShieldCheck className="size-4 text-secondary" aria-hidden="true" /> Mikrofon sedia digunakan.</div>
  if (status === "denied") return <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground"><ShieldAlert className="size-4 text-destructive" aria-hidden="true" /> Kebenaran mikrofon diperlukan untuk merakam suara.</div>
  if (status === "unsupported") return <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground"><MicOff className="size-4" aria-hidden="true" /> Pelayar ini tidak menyokong rakaman suara.</div>
  if (status === "busy") return <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">Mikrofon sedang digunakan oleh aplikasi lain.</div>
  if (status === "error") return <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">Rakaman tidak dapat dimulakan. Sila cuba lagi.</div>
  return null
}

