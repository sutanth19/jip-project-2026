import { BookOpen } from "lucide-react"

type InstructionPanelProps = { instructions: string }

export function InstructionPanel({ instructions }: InstructionPanelProps) {
  return (
    <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5" aria-labelledby="activity-instructions-heading">
      <div className="flex gap-3">
        <BookOpen className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <h2 id="activity-instructions-heading" className="font-semibold">Arahan</h2>
          <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground sm:text-base">{instructions}</p>
        </div>
      </div>
    </section>
  )
}
