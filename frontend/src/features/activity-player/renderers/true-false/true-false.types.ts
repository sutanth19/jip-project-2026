import type { ActivityQuestion } from "../../types"
import type { MultipleChoiceMapResult, MultipleChoiceQuestionModel, MultipleChoiceQuestionState, MultipleChoiceSessionState, MultipleChoiceSettings, MultipleChoiceOptionView } from "../multiple-choice/multiple-choice.types"

export type TrueFalseValue = boolean

export type TrueFalseOption = MultipleChoiceOptionView & {
  value: TrueFalseValue
  displayLabel: "BETUL" | "SALAH"
}

export type TrueFalseQuestionModel = Omit<MultipleChoiceQuestionModel, "mode" | "options"> & {
  mode: "SINGLE_CHOICE"
  options: [TrueFalseOption, TrueFalseOption]
}

export type TrueFalseQuestionState = MultipleChoiceQuestionState
export type TrueFalseSessionState = MultipleChoiceSessionState
export type TrueFalseSettings = MultipleChoiceSettings
export type TrueFalseActivityItem = ActivityQuestion

export type TrueFalseMapResult =
  | { ok: true; question: TrueFalseQuestionModel }
  | Extract<MultipleChoiceMapResult, { ok: false }>
