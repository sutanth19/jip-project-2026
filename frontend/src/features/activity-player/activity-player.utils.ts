import type { ActivityMedia, ActivityMediaKind, ActivityProgress } from "./types"

export function calculateActivityProgress(
  currentIndex: number,
  totalItems: number,
  completedItemIds: ReadonlySet<string>,
): ActivityProgress {
  const total = Math.max(totalItems, 0)
  const completed = Math.min(completedItemIds.size, total)
  const current = total === 0 ? 0 : Math.min(Math.max(currentIndex + 1, 1), total)

  return {
    current,
    total,
    completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
    isComplete: total > 0 && completed === total,
  }
}

export function getNextActivityIndex(currentIndex: number, totalItems: number): number {
  return totalItems === 0 ? 0 : Math.min(currentIndex + 1, totalItems - 1)
}

export function getPreviousActivityIndex(currentIndex: number): number {
  return Math.max(currentIndex - 1, 0)
}

export function getMediaKind(media: Pick<ActivityMedia, "mimeType" | "mediaKey" | "mediaRole">): ActivityMediaKind {
  const mimeType = media.mimeType?.toLowerCase() ?? ""
  const extension = media.mediaKey.split(".").pop()?.toLowerCase() ?? ""

  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) return "image"
  if (mimeType.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(extension)) return "audio"
  if (mimeType.startsWith("video/") || ["mp4", "webm"].includes(extension)) return "video"
  if (mimeType === "application/pdf" || extension === "pdf") return "pdf"
  if (media.mediaRole.includes("ANIMATION")) return "animation"

  return "unknown"
}

export function findActivityMedia(media: ActivityMedia[], roles: string[]): ActivityMedia | undefined {
  return media.find((item) => roles.includes(item.mediaRole))
}

export function getBooleanConfiguration(value: unknown, keys: string[]): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const configuration = value as Record<string, unknown>
  return keys.some((key) => configuration[key] === true)
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261
  for (const character of seed) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function nextRandom(seed: number): number {
  let value = seed + 0x6d2b79f5
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
}

export function stableShuffle<T>(values: readonly T[], seed: string): T[] {
  const shuffled = [...values]
  let state = hashSeed(seed)
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = Math.floor(nextRandom(state) * 4_294_967_296)
    const selectedIndex = Math.floor((state / 4_294_967_296) * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[selectedIndex] as T
    shuffled[selectedIndex] = current as T
  }
  return shuffled
}
