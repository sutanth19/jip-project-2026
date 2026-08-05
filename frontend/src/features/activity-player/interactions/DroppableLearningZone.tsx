import { useDroppable } from "@dnd-kit/core"
import type { KeyboardEvent, ReactNode } from "react"

import { cn } from "@/lib/utils"

type DroppableLearningZoneProps = {
  id: string
  label: string
  children: ReactNode
  disabled?: boolean
  className?: string
  onSelect?: () => void
}

export function DroppableLearningZone({ id, label, children, disabled = false, className, onSelect }: DroppableLearningZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled })
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || (event.key !== "Enter" && event.key !== " ")) return
    event.preventDefault()
    onSelect?.()
  }

  return <div ref={setNodeRef} role="group" tabIndex={disabled ? -1 : 0} aria-label={label} onClick={() => onSelect?.()} onKeyDown={onKeyDown} className={cn("rounded-xl border-2 border-dashed p-3 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50", isOver && "border-primary bg-primary/5", disabled && "cursor-default", className)}>{children}</div>
}
