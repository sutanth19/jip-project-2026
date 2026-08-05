import { EvidenceStrength, EvidenceType, MasteryLevel } from "@prisma/client";

/** Digital MoLIB product recommendation policy. It is not an official PBD score. */
export const MASTERY_POLICY = {
  achievedMinimumStandardEvidence: 2,
  masteredMinimumEvidence: 3,
  masteredMinimumActivities: 2,
  achievedRecentPercentage: 70,
  masteredRecentPercentage: 85,
  improvingDelta: 5,
  stableDelta: 5,
  recentEvidenceWindow: 3,
  levelWeights: {
    [MasteryLevel.NOT_STARTED]: 0,
    [MasteryLevel.EMERGING]: 25,
    [MasteryLevel.DEVELOPING]: 50,
    [MasteryLevel.ACHIEVED]: 75,
    [MasteryLevel.MASTERED]: 100,
  } as const,
  strengthWeights: {
    [EvidenceStrength.SUPPORTING]: 0.5,
    [EvidenceStrength.STANDARD]: 1,
    [EvidenceStrength.STRONG]: 1.25,
  } as const,
  quantitativeEvidenceTypes: [EvidenceType.AUTOMATIC_ASSESSMENT, EvidenceType.MANUAL_ASSESSMENT, EvidenceType.REVISION] as const,
} as const;
