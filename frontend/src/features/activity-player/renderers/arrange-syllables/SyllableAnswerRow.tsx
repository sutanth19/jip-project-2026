import { DroppableLearningZone } from "../../interactions/DroppableLearningZone"
import { SyllableTile } from "./SyllableTile"
import type { ArrangeSyllableUnit } from "./arrange-syllables.types"

type SyllableAnswerRowProps = {
  syllables: readonly ArrangeSyllableUnit[]
  arrangedSyllableIds: readonly string[]
  showTargetSlots: boolean
  activePosition: number
  disabled: boolean
  canDrag: boolean
  canClick: boolean
  onReturn: (syllableId: string) => void
}

export function SyllableAnswerRow({ syllables, arrangedSyllableIds, showTargetSlots, activePosition, disabled, canDrag, canClick, onReturn }: SyllableAnswerRowProps) {
  const syllableById = new Map(syllables.map((syllable) => [syllable.id, syllable]))
  const positions = showTargetSlots ? syllables.map((_, index) => index) : Array.from({ length: Math.max(syllables.length, arrangedSyllableIds.length + 1) }, (_, index) => index)
  return <section aria-labelledby="arrange-syllable-answer-heading" className="space-y-3"><div><h3 id="arrange-syllable-answer-heading" className="font-semibold">Susunan jawapan</h3><p className="text-sm text-muted-foreground">Susun suku kata untuk membentuk perkataan.</p></div><p className="sr-only" aria-live="polite">{activePosition < syllables.length ? `Kedudukan aktif ialah ${activePosition + 1} daripada ${syllables.length}.` : "Semua kedudukan jawapan telah diisi."}</p><div className="flex flex-wrap gap-2 sm:gap-3">{positions.map((position) => { const syllableId = arrangedSyllableIds[position]; const syllable = syllableId ? syllableById.get(syllableId) : undefined; return <DroppableLearningZone key={`slot-${position}`} id={`arrange-syllable-slot:${position}`} label={`Kedudukan suku kata ${position + 1}${syllable ? `, ${syllable.value}` : ", kosong"}`} disabled={disabled || !canDrag} className={`flex min-h-16 min-w-20 items-center justify-center p-1 ${position === activePosition && !syllable ? "border-primary bg-primary/5" : "bg-muted/20"}`}>{syllable ? <SyllableTile syllable={syllable} position={position} disabled={disabled} dragDisabled={!canDrag} clickEnabled={canClick} onSelect={() => onReturn(syllable.id)} /> : <span className="text-lg font-semibold text-muted-foreground" aria-hidden="true">?</span>}</DroppableLearningZone> })}</div></section>
}
