import { Button } from "@/components/ui/button"
import type { ReadingComprehensionOption } from "./reading.types"

export function ReadingOption({ option, selected, onSelect }: { option: ReadingComprehensionOption; selected: boolean; onSelect: () => void }) {
  return <Button type="button" variant={selected ? "default" : "outline"} className="h-auto min-h-12 w-full justify-start whitespace-normal py-3 text-left" onClick={onSelect}><span className="font-semibold">{option.label}.</span><span className="ml-2">{option.content}</span></Button>
}
