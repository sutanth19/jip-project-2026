import { useDraggable } from "@dnd-kit/core"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type DraggableLearningCardProps = {
  id: string
  children: ReactNode
  disabled?: boolean
  dragDisabled?: boolean
  selected?: boolean
  className?: string
  ariaLabel?: string
  onSelect?: () => void
}

export function DraggableLearningCard({ id, children, disabled = false, dragDisabled = false, selected = false, className, ariaLabel, onSelect }: DraggableLearningCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled: disabled || dragDisabled })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return <button ref={setNodeRef} type="button" disabled={disabled} style={style} className={cn("w-full touch-none rounded-xl outline-none transition-[opacity,transform] motion-reduce:transition-none focus-visible:ring-3 focus-visible:ring-ring/50", isDragging && "scale-105 opacity-40", selected && "ring-4 ring-blue-500 ring-offset-2", className)} {...listeners} {...attributes} aria-label={ariaLabel} aria-pressed={selected} onClick={(event) => { event.stopPropagation(); onSelect?.() }}>{children}</button>
}
