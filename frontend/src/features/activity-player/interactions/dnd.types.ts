export type ItemLocationMap = Record<string, string | null>

export type DndDropResult = {
  locations: ItemLocationMap
  accepted: boolean
}
