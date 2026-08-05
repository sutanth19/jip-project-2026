import { Card, CardContent } from "@/components/ui/card"

import { DraggableLearningCard } from "../../interactions/DraggableLearningCard"
import type { WordBuilderUnit } from "./word-builder.types"

type WordBuilderTileProps = {
  dragId: string
  unit: WordBuilderUnit
  position?: number
  disabled?: boolean
  dragDisabled?: boolean
  clickEnabled: boolean
  onSelect: () => void
}

export function WordBuilderTile({ dragId, unit, position, disabled = false, dragDisabled = false, clickEnabled, onSelect }: WordBuilderTileProps) {
  const location = position === undefined ? "dalam bank unit" : `di kedudukan jawapan ${position + 1}`
  const action = clickEnabled ? `Tekan untuk ${position === undefined ? "meletakkan" : "mengembalikan"} unit ini.` : "Gunakan kawalan seret dan lepas untuk menyusun unit ini."
  return <DraggableLearningCard id={dragId} disabled={disabled} dragDisabled={dragDisabled} ariaLabel={`Unit ${unit.value}, ${location}. ${action}`} className="w-auto min-w-20" onSelect={clickEnabled ? onSelect : undefined}><Card className="border-border bg-card shadow-sm"><CardContent className="flex min-h-16 items-center justify-center px-4 py-2 text-lg font-bold sm:text-xl">{unit.value}</CardContent></Card></DraggableLearningCard>
}
