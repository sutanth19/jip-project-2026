import { getBooleanConfiguration } from "../../activity-player.utils"
import { getPairingSettings, mapExplicitPairs } from "../../interactions/pairing.utils"
import type { PairingActivityItem, PairingMapResult } from "../../interactions/pairing.types"
import type { MatchingSettings } from "./matching.types"

function mediaPairingRequested(configuration: unknown): boolean {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) return false
  const pairMode = (configuration as Record<string, unknown>).pairMode
  return pairMode === "MEDIA" || pairMode === "MIXED"
}

export function mapMatchingQuestion(item: PairingActivityItem, configuration?: unknown): PairingMapResult {
  if (mediaPairingRequested(configuration)) {
    return { ok: false, message: "Pratonton semasa tidak menyediakan pautan media bagi setiap pilihan pasangan. Pemetaan media-ke-pilihan diperlukan untuk aktiviti MEDIA atau MIXED." }
  }
  return mapExplicitPairs(item)
}

export function getMatchingSettings(activity: Parameters<typeof getPairingSettings>[0]): MatchingSettings {
  return { ...getPairingSettings(activity), shufflePairs: getBooleanConfiguration(activity.configuration, ["shufflePairs"]) }
}
