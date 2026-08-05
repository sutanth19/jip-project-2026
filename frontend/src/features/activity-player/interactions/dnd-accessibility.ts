import type { Announcements } from "@dnd-kit/core"

export const learningDndAnnouncements: Announcements = {
  onDragStart: ({ active }) => `Mengambil item ${String(active.id)}.`,
  onDragOver: ({ active, over }) => over ? `Item ${String(active.id)} berada di atas ${String(over.id)}.` : `Item ${String(active.id)} tidak berada di atas zon.`,
  onDragEnd: ({ active, over }) => over ? `Item ${String(active.id)} diletakkan pada ${String(over.id)}.` : `Item ${String(active.id)} dikembalikan ke bank item.`,
  onDragCancel: ({ active }) => `Seretan item ${String(active.id)} dibatalkan.`,
}
