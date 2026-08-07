import { AssessmentItemStatus, AssessmentMethod, Prisma, QuestionAnswerType } from "@prisma/client";
import { validateArrangeLettersConfiguration } from "../contracts/arrange-letters.contract.js";
import { validateArrangeSyllablesConfiguration } from "../contracts/arrange-syllables.contract.js";
import { validateFillBlankConfiguration } from "../contracts/fill-blank.contract.js";
import { validateReadingComprehensionConfiguration } from "../contracts/reading-comprehension.contract.js";
import { validateWordBuilderConfiguration } from "../contracts/word-builder.contract.js";

export interface PublishedAnswerOption { id: string; label: string | null; content: string; isCorrect: boolean; sequence: number; }
export interface AutoEvaluationInput {
  rendererKey: string;
  method: AssessmentMethod;
  configuration: unknown;
  possibleMarks: Prisma.Decimal;
  question: {
    answerType: QuestionAnswerType;
    correctAnswer: Prisma.JsonValue | null;
    answerOptions: PublishedAnswerOption[];
  };
  answerJson: Prisma.JsonValue | null;
  isCompleted: boolean;
}

export interface AutoEvaluationResult {
  status: AssessmentItemStatus;
  correct: boolean | null;
  marksAwarded: Prisma.Decimal;
  possibleMarks: Prisma.Decimal;
  feedback: Prisma.InputJsonValue;
}

const zero = new Prisma.Decimal(0);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().normalize("NFC").replace(/\s+/gu, " ").toLocaleLowerCase("ms-MY");
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry));
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return [String(value)];
  return [];
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = record(value);
  if (!object) return JSON.stringify(value);
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function fullMark(correct: boolean, possibleMarks: Prisma.Decimal, type: string, metadata: Record<string, string | number | boolean | null> = {}): AutoEvaluationResult {
  return { status: AssessmentItemStatus.AUTO_ASSESSED, correct, marksAwarded: correct ? possibleMarks : zero, possibleMarks, feedback: { type, ...metadata } };
}

function selectedIds(answerJson: unknown): string[] {
  const answer = record(answerJson);
  if (!answer) return stringArray(answerJson);
  return stringArray(answer.selectedOptionIds ?? answer.selectedOptions ?? answer.optionIds ?? answer.value ?? answer.answer ?? answer.selectedOptionId ?? answer.optionId);
}

function evaluateChoice(input: AutoEvaluationInput, type: string): AutoEvaluationResult {
  const expected = input.question.answerOptions.filter((option) => option.isCorrect).map((option) => option.id).sort();
  const selected = selectedIds(input.answerJson).sort();
  return fullMark(stable(expected) === stable(selected), input.possibleMarks, type, { expectedCount: expected.length, selectedCount: selected.length });
}

function sequenceAnswer(answerJson: unknown): string[] {
  const answer = record(answerJson);
  if (!answer) return stringArray(answerJson);
  return stringArray(answer.unitIds ?? answer.letterUnitIds ?? answer.syllableIds ?? answer.selectedUnitIds ?? answer.order ?? answer.value ?? answer.answer);
}

function evaluateArrangeLetters(input: AutoEvaluationInput): AutoEvaluationResult {
  try {
    const configuration = validateArrangeLettersConfiguration(input.configuration);
    const expectedIds = configuration.arrangeLetters.letterUnits.map((unit) => unit.id);
    const expectedValues = configuration.arrangeLetters.letterUnits.map((unit) => unit.value);
    const supplied = sequenceAnswer(input.answerJson);
    const correct = stable(supplied) === stable(expectedIds) || normalize(supplied.join("")) === normalize(expectedValues.join(""));
    return fullMark(correct, input.possibleMarks, "arrange-letters", { unitCount: expectedIds.length });
  } catch {
    return evaluateExactJson(input, "arrange-letters");
  }
}

function evaluateArrangeSyllables(input: AutoEvaluationInput): AutoEvaluationResult {
  try {
    const configuration = validateArrangeSyllablesConfiguration(input.configuration);
    if (configuration.arrangeSyllables.mode !== "ORDERED_RECONSTRUCTION") {
      return evaluateExactJson(input, "arrange-syllables");
    }
    const expectedIds = configuration.arrangeSyllables.syllables.map((unit) => unit.id);
    const expectedValues = configuration.arrangeSyllables.syllables.map((unit) => unit.value);
    const supplied = sequenceAnswer(input.answerJson);
    const correct = stable(supplied) === stable(expectedIds) || normalize(supplied.join("")) === normalize(expectedValues.join(""));
    return fullMark(correct, input.possibleMarks, "arrange-syllables", { unitCount: expectedIds.length });
  } catch {
    return evaluateExactJson(input, "arrange-syllables");
  }
}

function evaluateWordBuilder(input: AutoEvaluationInput): AutoEvaluationResult {
  try {
    const configuration = validateWordBuilderConfiguration(input.configuration);
    const expectedIds = configuration.wordBuilder.units.map((unit) => unit.id);
    const expectedValues = configuration.wordBuilder.units.map((unit) => unit.value);
    const supplied = sequenceAnswer(input.answerJson);
    const correct = stable(supplied) === stable(expectedIds) || normalize(supplied.join("")) === normalize(expectedValues.join("")) || normalize(supplied.join("")) === normalize(configuration.wordBuilder.targetWord);
    return fullMark(correct, input.possibleMarks, "word-builder", { unitCount: expectedIds.length });
  } catch {
    return evaluateExactJson(input, "word-builder");
  }
}

function fillBlankAnswers(answerJson: unknown): Record<string, string> {
  const answer = record(answerJson);
  const source = record(answer?.answers ?? answer?.responses ?? answer?.values ?? answerJson);
  if (!source) return {};
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, String(value ?? "")]));
}

function evaluateFillBlank(input: AutoEvaluationInput): AutoEvaluationResult {
  try {
    const configuration = validateFillBlankConfiguration(input.configuration);
    const answers = fillBlankAnswers(input.answerJson);
    const total = configuration.fillBlank.blanks.length;
    const correctCount = configuration.fillBlank.blanks.filter((blank) => {
      const supplied = normalize(answers[blank.id] ?? answers[blank.marker] ?? "");
      return blank.acceptableAnswers.some((candidate) => normalize(candidate) === supplied);
    }).length;
    const marks = total === 0 ? zero : input.possibleMarks.mul(correctCount).div(total).toDecimalPlaces(2);
    return { status: AssessmentItemStatus.AUTO_ASSESSED, correct: correctCount === total, marksAwarded: marks, possibleMarks: input.possibleMarks, feedback: { type: "fill-blank", correctCount, blankCount: total } };
  } catch {
    return evaluateExactJson(input, "fill-blank");
  }
}

function evaluateReadingComprehension(input: AutoEvaluationInput): AutoEvaluationResult {
  try {
    const configuration = validateReadingComprehensionConfiguration(input.configuration);
    const supplied = record(input.answerJson);
    const answers = record(supplied?.answers ?? supplied?.responses ?? supplied) ?? {};
    let possible = zero;
    let awarded = zero;
    let correctCount = 0;
    for (const question of configuration.readingComprehension.questions) {
      if (question.type === "SHORT_TEXT") continue;
      const questionMarks = new Prisma.Decimal(question.marks);
      possible = possible.add(questionMarks);
      const selected = stringArray(record(answers[question.id])?.selectedOptionId ?? record(answers[question.id])?.answer ?? answers[question.id]).sort();
      const expected = question.options.filter((option) => option.isCorrect).map((option) => option.id).sort();
      if (stable(selected) === stable(expected)) {
        awarded = awarded.add(questionMarks);
        correctCount += 1;
      }
    }
    const possibleMarks = possible.gt(0) ? possible : input.possibleMarks;
    const scaled = possible.gt(0) && !possible.eq(input.possibleMarks) ? input.possibleMarks.mul(awarded).div(possible).toDecimalPlaces(2) : awarded.toDecimalPlaces(2);
    return { status: AssessmentItemStatus.AUTO_ASSESSED, correct: possible.eq(awarded), marksAwarded: scaled, possibleMarks, feedback: { type: "reading-comprehension-objective", correctCount, questionCount: configuration.readingComprehension.questions.filter((question) => question.type !== "SHORT_TEXT").length } };
  } catch {
    return evaluateChoice(input, "reading-comprehension-objective");
  }
}

function evaluateExactJson(input: AutoEvaluationInput, type: string): AutoEvaluationResult {
  const expected = input.question.correctAnswer;
  const answer = record(input.answerJson);
  const supplied = answer && "answer" in answer ? answer.answer : input.answerJson;
  return fullMark(expected !== null && stable(expected) === stable(supplied), input.possibleMarks, type);
}

export function evaluateAutomaticItem(input: AutoEvaluationInput): AutoEvaluationResult {
  if (input.method === AssessmentMethod.MANUAL) return { status: AssessmentItemStatus.PENDING, correct: null, marksAwarded: zero, possibleMarks: input.possibleMarks, feedback: { type: "manual-pending" } };
  if (input.method === AssessmentMethod.COMPLETION) return { status: AssessmentItemStatus.NOT_ASSESSED, correct: input.isCompleted, marksAwarded: zero, possibleMarks: zero, feedback: { type: "completion", completed: input.isCompleted } };
  if (input.rendererKey === "fill-blank") return evaluateFillBlank(input);
  if (input.rendererKey === "arrange-letters") return evaluateArrangeLetters(input);
  if (input.rendererKey === "arrange-syllables") return evaluateArrangeSyllables(input);
  if (input.rendererKey === "word-builder") return evaluateWordBuilder(input);
  if (input.rendererKey === "reading-comprehension") return evaluateReadingComprehension(input);
  if (input.question.answerType === QuestionAnswerType.SINGLE_CHOICE || input.question.answerType === QuestionAnswerType.MULTIPLE_CHOICE || input.rendererKey === "multiple-choice" || input.rendererKey === "true-false") return evaluateChoice(input, input.rendererKey);
  if (input.question.answerType === QuestionAnswerType.BOOLEAN) return evaluateChoice(input, "true-false");
  return evaluateExactJson(input, input.rendererKey);
}
