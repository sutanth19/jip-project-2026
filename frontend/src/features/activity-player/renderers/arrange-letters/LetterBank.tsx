import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { DroppableLearningZone } from "../../interactions/DroppableLearningZone"
import { LetterTile } from "./LetterTile"
import type { ArrangeLettersUnit } from "./arrange-letters.types"

type LetterBankProps = {
  units: ArrangeLettersUnit[]
  arrangedLetterIds: readonly string[]
  disabled: boolean
  canDrag: boolean
  onSelect: (letterId: string) => void
  onReturn: () => void
}

export function LetterBank({ units, arrangedLetterIds, disabled, canDrag, onSelect, onReturn }: LetterBankProps) {
  const arrangedIds = new Set(arrangedLetterIds)
  const available = units.filter((unit) => !arrangedIds.has(unit.id))
  return <DroppableLearningZone id="arrange-bank" label="Bank huruf. Seret huruf jawapan ke sini untuk mengembalikannya." disabled={disabled || !canDrag} onSelect={onReturn} className="bg-muted/30"><Card className="border-0 bg-transparent shadow-none"><CardHeader className="p-0 pb-3"><CardTitle className="text-base">Bank huruf</CardTitle><p className="text-sm text-muted-foreground">{available.length} huruf belum digunakan.</p></CardHeader><CardContent className="p-0">{available.length === 0 ? <p className="text-sm text-muted-foreground">Semua huruf telah diletakkan dalam jawapan.</p> : <div className="flex flex-wrap gap-3">{available.map((unit) => <LetterTile key={unit.id} unit={unit} disabled={disabled} dragDisabled={!canDrag} onSelect={() => onSelect(unit.id)} />)}</div>}</CardContent></Card></DroppableLearningZone>
}
