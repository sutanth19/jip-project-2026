import type { PairingQuestion, PairingSessionState, PairingSettings, PairingState } from "../../interactions/pairing.types"

export type MatchingQuestion = PairingQuestion
export type MatchingState = PairingState
export type MatchingSessionState = PairingSessionState
export type MatchingSettings = PairingSettings & { shufflePairs: boolean }
