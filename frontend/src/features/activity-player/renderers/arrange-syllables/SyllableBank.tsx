import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { DroppableLearningZone } from "../../interactions/DroppableLearningZone"
import { SyllableTile } from "./SyllableTile"
import type { ArrangeSyllableUnit } from "./arrange-syllables.types"

type SyllableBankProps = {
  syllables: ArrangeSyllableUnit[]
  arrangedSyllableIds: readonly string[]
  disabled: boolean
  canDrag: boolean
  canClick: boolean
  onSelect: (syllableId: string) => void
  onReturn: () => void
}

export function SyllableBank({ syllables, arrangedSyllableIds, disabled, canDrag, canClick, onSelect, onReturn }: SyllableBankProps) {
  const arrangedIds = new Set(arrangedSyllableIds)
  const available = syllables.filter((syllable) => !arrangedIds.has(syllable.id))
  return <DroppableLearningZone id="arrange-syllable-bank" label="Bank suku kata. Seret suku kata jawapan ke sini untuk mengembalikannya." disabled={disabled || !canDrag} onSelect={onReturn} className="bg-muted/30"><Card className="border-0 bg-transparent shadow-none"><CardHeader className="p-0 pb-3"><CardTitle className="text-base">Bank suku kata</CardTitle><p className="text-sm text-muted-foreground">{available.length} suku kata belum digunakan.</p></CardHeader><CardContent className="p-0">{available.length === 0 ? <p className="text-sm text-muted-foreground">Semua suku kata telah diletakkan dalam jawapan.</p> : <div className="flex flex-wrap gap-3">{available.map((syllable) => <SyllableTile key={syllable.id} syllable={syllable} disabled={disabled} dragDisabled={!canDrag} clickEnabled={canClick} onSelect={() => onSelect(syllable.id)} />)}</div>}</CardContent></Card></DroppableLearningZone>
}
