import { AssessmentItemStatus, AssessmentResult, AssessmentStatus, Prisma } from "@prisma/client";

export interface AssessmentTotalsInput {
  items: readonly {
    status: AssessmentItemStatus;
    marksAwarded: Prisma.Decimal | number | string;
    possibleMarks: Prisma.Decimal | number | string;
  }[];
  adjustments: readonly { difference: Prisma.Decimal | number | string }[];
  passPercentage: Prisma.Decimal | number | string | null;
}

export interface AssessmentTotals {
  automaticMarks: Prisma.Decimal;
  manualMarks: Prisma.Decimal;
  adjustedMarks: Prisma.Decimal;
  finalMarks: Prisma.Decimal;
  possibleMarks: Prisma.Decimal;
  percentage: Prisma.Decimal | null;
  result: AssessmentResult;
  status: AssessmentStatus;
}

const zero = new Prisma.Decimal(0);

function dec(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function roundMarks(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2);
}

export function calculateAssessmentTotals(input: AssessmentTotalsInput): AssessmentTotals {
  let automaticMarks = zero;
  let manualMarks = zero;
  let possibleMarks = zero;
  let hasPendingManual = false;
  let hasAutomatic = false;
  let hasManual = false;

  for (const item of input.items) {
    const awarded = dec(item.marksAwarded);
    const possible = dec(item.possibleMarks);
    possibleMarks = possibleMarks.add(possible);
    if (item.status === AssessmentItemStatus.AUTO_ASSESSED) {
      automaticMarks = automaticMarks.add(awarded);
      hasAutomatic = true;
    } else if (item.status === AssessmentItemStatus.MANUALLY_ASSESSED) {
      manualMarks = manualMarks.add(awarded);
      hasManual = true;
    } else if (item.status === AssessmentItemStatus.PENDING) {
      hasPendingManual = true;
      hasManual = true;
    }
  }

  const adjustedMarks = input.adjustments.reduce((sum, adjustment) => sum.add(dec(adjustment.difference)), zero);
  const finalMarks = Prisma.Decimal.max(zero, automaticMarks.add(manualMarks).add(adjustedMarks)).toDecimalPlaces(2);
  const percentage = possibleMarks.gt(0) ? finalMarks.mul(100).div(possibleMarks).toDecimalPlaces(2) : null;
  const result = percentage === null
    ? AssessmentResult.NOT_APPLICABLE
    : input.passPercentage === null
      ? AssessmentResult.NOT_APPLICABLE
      : percentage.gte(dec(input.passPercentage))
        ? AssessmentResult.PASSED
        : AssessmentResult.FAILED;
  const status = hasPendingManual
    ? hasAutomatic
      ? AssessmentStatus.PARTIALLY_ASSESSED
      : AssessmentStatus.PENDING
    : hasManual || hasAutomatic
      ? AssessmentStatus.COMPLETED
      : AssessmentStatus.COMPLETED;
  return {
    automaticMarks: roundMarks(automaticMarks),
    manualMarks: roundMarks(manualMarks),
    adjustedMarks: roundMarks(adjustedMarks),
    finalMarks,
    possibleMarks: roundMarks(possibleMarks),
    percentage,
    result: possibleMarks.eq(0) ? AssessmentResult.COMPLETED : result,
    status: !hasPendingManual && hasAutomatic && !hasManual ? AssessmentStatus.AUTO_ASSESSED : status,
  };
}
