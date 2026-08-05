import type { ComponentType } from "react"

import { ComingSoonRenderer } from "./renderers/ComingSoonRenderer"
import { ArrangeLettersPlayer } from "./renderers/ArrangeLettersPlayer"
import { ArrangeSyllablesPlayer } from "./renderers/ArrangeSyllablesPlayer"
import { CopyWritingPlayer } from "./renderers/CopyWritingPlayer"
import { DragDropPlayer } from "./renderers/DragDropPlayer"
import { FillInBlankPlayer } from "./renderers/FillInBlankPlayer"
import { FreeHandwritingPlayer } from "./renderers/FreeHandwritingPlayer"
import { MatchingPlayer } from "./renderers/MatchingPlayer"
import { MultipleChoicePlayer } from "./renderers/MultipleChoicePlayer"
import { ReadingPlayer } from "./renderers/ReadingPlayer"
import { ReadingComprehensionPlayer } from "./renderers/ReadingComprehensionPlayer"
import { VoiceRecordingPlayer } from "./renderers/VoiceRecordingPlayer"
import { TrueFalsePlayer } from "./renderers/TrueFalsePlayer"
import { WordBuilderPlayer } from "./renderers/WordBuilderPlayer"

export type ActivityRendererComponent = ComponentType

function createComingSoonRenderer(rendererKey: string, title: string): ActivityRendererComponent {
  return function RegisteredComingSoonRenderer() {
    return <ComingSoonRenderer rendererKey={rendererKey} title={title} />
  }
}

export const activityRendererRegistry: Record<string, ActivityRendererComponent> = {
  "multiple-choice": MultipleChoicePlayer,
  "true-false": TrueFalsePlayer,
  matching: MatchingPlayer,
  "drag-drop": DragDropPlayer,
  "fill-blank": FillInBlankPlayer,
  "arrange-letters": ArrangeLettersPlayer,
  "arrange-syllables": ArrangeSyllablesPlayer,
  "word-builder": WordBuilderPlayer,
  tracing: createComingSoonRenderer("tracing", "Menekap"),
  "copy-writing": CopyWritingPlayer,
  "free-handwriting": FreeHandwritingPlayer,
  reading: ReadingPlayer,
  "reading-comprehension": ReadingComprehensionPlayer,
  "voice-recording": VoiceRecordingPlayer,
}

export function getActivityRenderer(rendererKey: string): ActivityRendererComponent | undefined {
  return activityRendererRegistry[rendererKey]
}
