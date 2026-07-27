import { CheckCircle2, ImageOff, XCircle } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

import { getMediaKind } from "../../activity-player.utils"
import { MediaViewer } from "../../components/MediaViewer"
import type { MultipleChoiceMode, MultipleChoiceOptionView } from "./multiple-choice.types"

type OptionStatus = "neutral" | "correct" | "incorrect"

type MultipleChoiceOptionProps = {
  option: MultipleChoiceOptionView
  mode: MultipleChoiceMode
  selected: boolean
  disabled: boolean
  status: OptionStatus
  onSelect: (optionId: string) => void
}

export function MultipleChoiceOption({ option, mode, selected, disabled, status, onSelect }: MultipleChoiceOptionProps) {
  const image = option.media.find((media) => getMediaKind(media) === "image")
  const audio = option.media.find((media) => getMediaKind(media) === "audio")
  const description = [option.label, option.content].filter(Boolean).join(". ") || "Pilihan jawapan media"

  return (
    <label className={cn("group relative flex min-h-24 cursor-pointer flex-col gap-3 rounded-2xl border-2 bg-card p-4 text-left shadow-sm transition-all motion-reduce:transition-none", "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50", selected && "border-primary bg-primary/5", status === "correct" && "border-secondary bg-secondary/10", status === "incorrect" && "border-destructive bg-destructive/10", disabled && "cursor-default opacity-85")}>
      <div className="flex items-start gap-3">
        {mode === "SINGLE_CHOICE" ? <RadioGroupItem value={option.id} id={`option-${option.id}`} disabled={disabled} aria-label={description} className="mt-1 size-5" /> : <Checkbox id={`option-${option.id}`} checked={selected} disabled={disabled} aria-label={description} onCheckedChange={() => onSelect(option.id)} className="mt-1 size-5" />}
        <div className="min-w-0 flex-1 space-y-1"><p className="text-base font-semibold sm:text-lg">{option.label ? <span className="mr-2 text-muted-foreground">{option.label}</span> : null}{option.content || "Pilihan bergambar"}</p>{status === "correct" ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-secondary"><CheckCircle2 className="size-4" /> Betul</span> : null}{status === "incorrect" ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-destructive"><XCircle className="size-4" /> Belum tepat</span> : null}</div>
      </div>
      {image ? <MediaViewer media={image} className="max-h-52 w-full rounded-xl object-contain" /> : null}
      {audio ? <MediaViewer media={audio} className="w-full" /> : null}
      {!option.content && !image && !audio ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><ImageOff className="size-4" /> Media pilihan tidak tersedia.</div> : null}
    </label>
  )
}
