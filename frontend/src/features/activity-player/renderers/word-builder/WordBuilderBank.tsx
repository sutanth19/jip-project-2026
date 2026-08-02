import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { DroppableLearningZone } from "../../interactions/DroppableLearningZone"
import { WordBuilderTile } from "./WordBuilderTile"
import type { WordBuilderQuestion, WordBuilderState, WordBuilderUnit } from "./word-builder.types"

type WordBuilderBankProps = {
  question: WordBuilderQuestion
  state: WordBuilderState
  units: WordBuilderUnit[]
  disabled: boolean
  canDrag: boolean
  canClick: boolean
  onSelect: (unitId: string) => void
}

export function WordBuilderBank({ question, state, units, disabled, canDrag, canClick, onSelect }: WordBuilderBankProps) {
  const usedUnitIds = new Set(state.placements.map((placement) => placement.unitId))
  const available = question.allowReuse ? units : units.filter((unit) => !usedUnitIds.has(unit.id))
  return <DroppableLearningZone id="word-builder-bank" label="Bank unit. Seret unit jawapan ke sini untuk mengembalikannya." disabled={disabled || !canDrag} className="bg-muted/30"><Card className="border-0 bg-transparent shadow-none"><CardHeader className="p-0 pb-3"><CardTitle className="text-base">Bank unit</CardTitle><p className="text-sm text-muted-foreground">Pilih unit yang sesuai untuk membina perkataan.</p></CardHeader><CardContent className="p-0">{available.length === 0 ? <p className="text-sm text-muted-foreground">Semua unit yang tersedia telah digunakan.</p> : <div className="flex flex-wrap gap-3">{available.map((unit) => <WordBuilderTile key={unit.id} dragId={`word-builder-unit:${unit.id}`} unit={unit} disabled={disabled} dragDisabled={!canDrag} clickEnabled={canClick} onSelect={() => onSelect(unit.id)} />)}</div>}</CardContent></Card></DroppableLearningZone>
}
