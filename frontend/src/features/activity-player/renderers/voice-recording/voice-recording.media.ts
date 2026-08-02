import type { ActivityMedia } from "../../types"

export function revokeMediaUrl(url: string | null): void {
  if (url) URL.revokeObjectURL(url)
}

export function createRecordingUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export function choosePromptMedia(media: ActivityMedia[]): ActivityMedia | undefined {
  return media[0]
}

