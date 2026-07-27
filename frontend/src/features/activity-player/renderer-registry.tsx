import type { ComponentType } from "react"

import { ComingSoonRenderer } from "./renderers/ComingSoonRenderer"
import { MultipleChoicePlayer } from "./renderers/MultipleChoicePlayer"

export type ActivityRendererComponent = ComponentType

function createComingSoonRenderer(rendererKey: string, title: string): ActivityRendererComponent {
  return function RegisteredComingSoonRenderer() {
    return <ComingSoonRenderer rendererKey={rendererKey} title={title} />
  }
}

export const activityRendererRegistry: Record<string, ActivityRendererComponent> = {
  "multiple-choice": MultipleChoicePlayer,
  "true-false": createComingSoonRenderer("true-false", "Betul atau Salah"),
  matching: createComingSoonRenderer("matching", "Padankan"),
  "drag-drop": createComingSoonRenderer("drag-drop", "Seret dan Lepas"),
  "fill-blank": createComingSoonRenderer("fill-blank", "Isi Tempat Kosong"),
  "arrange-letters": createComingSoonRenderer("arrange-letters", "Susun Huruf"),
  "arrange-syllables": createComingSoonRenderer("arrange-syllables", "Susun Suku Kata"),
  "word-builder": createComingSoonRenderer("word-builder", "Bina Perkataan"),
  tracing: createComingSoonRenderer("tracing", "Menekap"),
  "copy-writing": createComingSoonRenderer("copy-writing", "Menyalin"),
  "free-handwriting": createComingSoonRenderer("free-handwriting", "Tulisan Bebas"),
  reading: createComingSoonRenderer("reading", "Bacaan"),
  "reading-comprehension": createComingSoonRenderer("reading-comprehension", "Kefahaman Bacaan"),
  "voice-recording": createComingSoonRenderer("voice-recording", "Rakaman Suara"),
}

export function getActivityRenderer(rendererKey: string): ActivityRendererComponent | undefined {
  return activityRendererRegistry[rendererKey]
}
