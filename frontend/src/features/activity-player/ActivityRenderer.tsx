import { useActivityPlayer } from "./useActivityPlayer"
import { UnsupportedRenderer } from "./components/UnsupportedRenderer"
import { ArrangeLettersPlayer } from "./renderers/ArrangeLettersPlayer"
import { ArrangeSyllablesPlayer } from "./renderers/ArrangeSyllablesPlayer"
import { CopyWritingPlayer } from "./renderers/CopyWritingPlayer"
import { DragDropPlayer } from "./renderers/DragDropPlayer"
import { FillInBlankPlayer } from "./renderers/FillInBlankPlayer"
import { FreeHandwritingPlayer } from "./renderers/FreeHandwritingPlayer"
import { MatchingPlayer } from "./renderers/MatchingPlayer"
import { MultipleChoicePlayer } from "./renderers/MultipleChoicePlayer"
import { ReadingComprehensionPlayer } from "./renderers/ReadingComprehensionPlayer"
import { ReadingPlayer } from "./renderers/ReadingPlayer"
import { TrueFalsePlayer } from "./renderers/TrueFalsePlayer"
import { VoiceRecordingPlayer } from "./renderers/VoiceRecordingPlayer"
import { WordBuilderPlayer } from "./renderers/WordBuilderPlayer"

export function ActivityRenderer() {
  const { activity, currentItem } = useActivityPlayer()
  const key = currentItem?.id ?? activity.id
  switch (activity.template.rendererKey) {
    case "multiple-choice": return <MultipleChoicePlayer key={key} />
    case "true-false": return <TrueFalsePlayer key={key} />
    case "matching": return <MatchingPlayer key={key} />
    case "drag-drop": return <DragDropPlayer key={key} />
    case "fill-blank": return <FillInBlankPlayer key={key} />
    case "arrange-letters": return <ArrangeLettersPlayer key={key} />
    case "arrange-syllables": return <ArrangeSyllablesPlayer key={key} />
    case "word-builder": return <WordBuilderPlayer key={key} />
    case "copy-writing": return <CopyWritingPlayer key={key} />
    case "free-handwriting": return <FreeHandwritingPlayer key={key} />
    case "reading": return <ReadingPlayer key={key} />
    case "reading-comprehension": return <ReadingComprehensionPlayer key={key} />
    case "voice-recording": return <VoiceRecordingPlayer key={key} />
    default: return <UnsupportedRenderer rendererKey={activity.template.rendererKey} />
  }
}
