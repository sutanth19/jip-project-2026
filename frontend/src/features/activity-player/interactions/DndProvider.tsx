import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCorners, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import type { ReactNode } from "react"

import { learningDndAnnouncements } from "./dnd-accessibility"

type DndProviderProps = {
  children: ReactNode
  onDragStart: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
}

export function DndProvider({ children, onDragStart, onDragEnd }: DndProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  return <DndContext sensors={sensors} collisionDetection={closestCorners} accessibility={{ announcements: learningDndAnnouncements }} onDragStart={onDragStart} onDragEnd={onDragEnd}>{children}</DndContext>
}
