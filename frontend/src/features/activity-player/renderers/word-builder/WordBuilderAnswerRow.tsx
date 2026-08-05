import { DroppableLearningZone } from "../../interactions/DroppableLearningZone"
import { WordBuilderTile } from "./WordBuilderTile"
import type { WordBuilderQuestion, WordBuilderState, WordBuilderUnit } from "./word-builder.types"

type WordBuilderAnswerRowProps = {
  question: WordBuilderQuestion
  state: WordBuilderState
  unitsById: ReadonlyMap<string, WordBuilderUnit>
  disabled: boolean
  canDrag: boolean
  canClick: boolean
  onReturn: (placementId: string) => void
}

export function WordBuilderAnswerRow({ question, state, unitsById, disabled, canDrag, canClick, onReturn }: WordBuilderAnswerRowProps) {
  const activePosition = Math.min(state.placements.length, question.targetUnits.length)
  const positions = question.showTargetSlots ? question.targetUnits.map((_, index) => index) : Array.from({ length: Math.max(question.targetUnits.length, state.placements.length + 1) }, (_, index) => index)
  return <section aria-labelledby="word-builder-answer-heading" className="space-y-3"><div><h3 id="word-builder-answer-heading" className="font-semibold">Perkataan dibina</h3><p className="text-sm text-muted-foreground">Susun unit dalam urutan yang betul.</p></div><p className="sr-only" aria-live="polite">{activePosition < question.targetUnits.length ? `Kedudukan aktif ialah ${activePosition + 1} daripada ${question.targetUnits.length}.` : "Semua kedudukan jawapan telah diisi."}</p><div className="flex flex-wrap gap-2 sm:gap-3">{positions.map((position) => { const placement = state.placements[position]; const unit = placement ? unitsById.get(placement.unitId) : undefined; return <DroppableLearningZone key={`slot-${position}`} id={`word-builder-slot:${position}`} label={`Kedudukan unit ${position + 1}${unit ? `, ${unit.value}` : ", kosong"}`} disabled={disabled || !canDrag} className={`flex min-h-16 min-w-20 items-center justify-center p-1 ${position === activePosition && !unit ? "border-primary bg-primary/5" : "bg-muted/20"}`}>{placement && unit ? <WordBuilderTile dragId={`word-builder-placement:${placement.id}`} unit={unit} position={position} disabled={disabled} dragDisabled={!canDrag} clickEnabled={canClick} onSelect={() => onReturn(placement.id)} /> : <span className="text-lg font-semibold text-muted-foreground" aria-hidden="true">?</span>}</DroppableLearningZone> })}</div></section>
}
