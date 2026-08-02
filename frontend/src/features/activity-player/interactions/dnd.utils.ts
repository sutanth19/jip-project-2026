import type { DndDropResult, ItemLocationMap } from "./dnd.types"

export function getItemsInZone(locations: ItemLocationMap, zoneId: string): string[] {
  return Object.entries(locations).filter(([, location]) => location === zoneId).map(([itemId]) => itemId)
}

export function moveItemToZone(locations: ItemLocationMap, itemId: string, zoneId: string | null, capacity: number | null): DndDropResult {
  if (!(itemId in locations)) return { locations, accepted: false }
  if (zoneId !== null && capacity !== null && getItemsInZone(locations, zoneId).filter((id) => id !== itemId).length >= capacity) {
    return { locations, accepted: false }
  }
  return { locations: { ...locations, [itemId]: zoneId }, accepted: true }
}

export function clearItemLocations(itemIds: readonly string[]): ItemLocationMap {
  return Object.fromEntries(itemIds.map((itemId) => [itemId, null]))
}
