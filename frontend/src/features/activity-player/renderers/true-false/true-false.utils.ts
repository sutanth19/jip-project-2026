import { getMultipleChoiceSettings, mapChoiceQuestion } from "../multiple-choice/multiple-choice.utils"
import type { MultipleChoiceOptionView } from "../multiple-choice/multiple-choice.types"
import type { TrueFalseActivityItem, TrueFalseMapResult, TrueFalseOption, TrueFalseSettings, TrueFalseValue } from "./true-false.types"

function toBooleanValue(content: string): TrueFalseValue | null {
  const normalized = content.trim().toLowerCase()
  if (normalized === "true" || normalized === "betul") return true
  if (normalized === "false" || normalized === "salah") return false
  return null
}

function toTrueFalseOption(option: MultipleChoiceOptionView): TrueFalseOption | null {
  const value = toBooleanValue(option.content)
  if (value === null) return null
  return { ...option, value, displayLabel: value ? "BETUL" : "SALAH" }
}

export function mapTrueFalseQuestion(item: TrueFalseActivityItem): TrueFalseMapResult {
  if (item.questionBankItem.answerType !== "BOOLEAN") {
    return { ok: false, message: "Jenis jawapan item ini tidak disokong oleh pemain Betul atau Salah." }
  }

  const mapped = mapChoiceQuestion(item, "SINGLE_CHOICE")
  if (!mapped.ok) return mapped

  const options = mapped.question.options.map(toTrueFalseOption)
  const trueOption = options.find((option) => option?.value === true)
  const falseOption = options.find((option) => option?.value === false)
  if (options.some((option) => option === null) || !trueOption || !falseOption || options.length !== 2 || mapped.question.correctOptionIds.size !== 1) {
    return { ok: false, message: "Item Betul atau Salah mesti mempunyai tepat dua pilihan: true dan false." }
  }

  return { ok: true, question: { ...mapped.question, mode: "SINGLE_CHOICE", options: [trueOption, falseOption] } }
}

export function getTrueFalseSettings(activity: Parameters<typeof getMultipleChoiceSettings>[0]): TrueFalseSettings {
  return getMultipleChoiceSettings(activity)
}
