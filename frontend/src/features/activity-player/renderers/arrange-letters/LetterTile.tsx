import { Card, CardContent } from "@/components/ui/card"

import { DraggableLearningCard } from "../../interactions/DraggableLearningCard"
import type { ArrangeLettersUnit } from "./arrange-letters.types"

type LetterTileProps = {
  unit: ArrangeLettersUnit
  position?: number
  disabled?: boolean
  dragDisabled?: boolean
  onSelect: () => void
}

export function LetterTile({ unit, position, disabled = false, dragDisabled = false, onSelect }: LetterTileProps) {
  const positionText = position === undefined ? "dalam bank huruf" : `di kedudukan jawapan ${position + 1}`
  return <DraggableLearningCard id={`arrange-letter:${unit.id}`} disabled={disabled} dragDisabled={dragDisabled} ariaLabel={`Huruf ${unit.value}, ${positionText}. Tekan untuk ${position === undefined ? "meletakkan" : "mengembalikan"} huruf ini.`} className="w-14 sm:w-16" onSelect={onSelect}><Card className="border-border bg-card shadow-sm"><CardContent className="flex min-h-14 items-center justify-center p-2 text-xl font-bold sm:min-h-16 sm:text-2xl">{unit.value}</CardContent></Card></DraggableLearningCard>
}
