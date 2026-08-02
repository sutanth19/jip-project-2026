import { DroppableLearningZone } from "../../interactions/DroppableLearningZone"
import { LetterTile } from "./LetterTile"
import type { ArrangeLettersUnit } from "./arrange-letters.types"

type LetterAnswerRowProps = {
  units: readonly ArrangeLettersUnit[]
  arrangedLetterIds: readonly string[]
  showTargetSlots: boolean
  activePosition: number
  disabled: boolean
  canDrag: boolean
  onReturn: (letterId: string) => void
}

export function LetterAnswerRow({ units, arrangedLetterIds, showTargetSlots, activePosition, disabled, canDrag, onReturn }: LetterAnswerRowProps) {
  const unitById = new Map(units.map((unit) => [unit.id, unit]))
  const positions = showTargetSlots ? units.map((_, index) => index) : Array.from({ length: Math.max(units.length, arrangedLetterIds.length + 1) }, (_, index) => index)
  return <section aria-labelledby="arrange-answer-heading" className="space-y-3"><div><h3 id="arrange-answer-heading" className="font-semibold">Susunan jawapan</h3><p className="text-sm text-muted-foreground">Pilih huruf daripada bank atau seretnya ke kedudukan yang sesuai.</p></div><p className="sr-only" aria-live="polite">{activePosition < units.length ? `Kedudukan aktif ialah ${activePosition + 1} daripada ${units.length}.` : "Semua kedudukan jawapan telah diisi."}</p><div className="flex flex-wrap gap-2 sm:gap-3">{positions.map((position) => { const letterId = arrangedLetterIds[position]; const unit = letterId ? unitById.get(letterId) : undefined; return <DroppableLearningZone key={`slot-${position}`} id={`arrange-slot:${position}`} label={`Kedudukan jawapan ${position + 1}${unit ? `, huruf ${unit.value}` : ", kosong"}`} disabled={disabled || !canDrag} className={`flex min-h-16 min-w-14 items-center justify-center p-1 ${position === activePosition && !unit ? "border-primary bg-primary/5" : "bg-muted/20"}`}>{unit ? <LetterTile unit={unit} position={position} disabled={disabled} dragDisabled={!canDrag} onSelect={() => onReturn(unit.id)} /> : <span className="text-lg font-semibold text-muted-foreground" aria-hidden="true">?</span>}</DroppableLearningZone> })}</div></section>
}
