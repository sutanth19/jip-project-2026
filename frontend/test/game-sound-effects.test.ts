import { describe, expect, it } from "vitest"

import { playCorrectGameSound, playPickUpGameSound, playWrongGameSound } from "@/features/activity-player/audio/gameSoundEffects"

describe("game sound effects", () => {
  it("safely does nothing when Web Audio is unavailable", () => {
    expect(() => playPickUpGameSound()).not.toThrow()
    expect(() => playCorrectGameSound()).not.toThrow()
    expect(() => playWrongGameSound()).not.toThrow()
  })
})
