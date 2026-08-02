import { Card, CardContent } from "@/components/ui/card"

import { DraggableLearningCard } from "../../interactions/DraggableLearningCard"
import type { ArrangeSyllableUnit } from "./arrange-syllables.types"

type SyllableTileProps = {
  syllable: ArrangeSyllableUnit
  position?: number
  disabled?: boolean
  dragDisabled?: boolean
  clickEnabled: boolean
  onSelect: () => void
}

export function SyllableTile({ syllable, position, disabled = false, dragDisabled = false, clickEnabled, onSelect }: SyllableTileProps) {
  const positionText = position === undefined ? "dalam bank suku kata" : `di kedudukan jawapan ${position + 1}`
  const action = clickEnabled ? `Tekan untuk ${position === undefined ? "meletakkan" : "mengembalikan"} suku kata ini.` : "Gunakan kawalan seret dan lepas untuk menyusun suku kata ini."
  return <DraggableLearningCard id={`arrange-syllable:${syllable.id}`} disabled={disabled} dragDisabled={dragDisabled} ariaLabel={`Suku kata ${syllable.value}, ${positionText}. ${action}`} className="w-auto min-w-20" onSelect={clickEnabled ? onSelect : undefined}><Card className="border-border bg-card shadow-sm"><CardContent className="flex min-h-16 items-center justify-center px-4 py-2 text-lg font-bold sm:text-xl">{syllable.value}</CardContent></Card></DraggableLearningCard>
}
