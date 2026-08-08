import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCorners, pointerWithin, useSensor, useSensors, type CollisionDetection, type DragCancelEvent, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import type { ReactNode } from "react"

import { learningDndAnnouncements } from "./dnd-accessibility"

type DndProviderProps = {
  children: ReactNode
  onDragStart: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onDragCancel?: (event: DragCancelEvent) => void
}

const learningCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (args.pointerCoordinates) return pointerCollisions
  return pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args)
}

export function DndProvider({ children, onDragStart, onDragEnd, onDragCancel }: DndProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  return <DndContext sensors={sensors} collisionDetection={learningCollisionDetection} accessibility={{ announcements: learningDndAnnouncements }} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>{children}</DndContext>
}
