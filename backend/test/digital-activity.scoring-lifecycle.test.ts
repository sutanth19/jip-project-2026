import assert from "node:assert/strict";
import test from "node:test";

import {
  ActivityReviewMode,
  ActivityScoringMode,
  ActivityTemplateCategory,
  ActivityTemplateStatus,
  AssessmentMode,
  CurriculumStatus,
  DigitalActivityStatus,
  LearningDifficulty,
  QuestionAnswerType,
  QuestionBankItemType,
  QuestionBankStatus,
  UserRole,
} from "@prisma/client";

import { prisma } from "../src/config/prisma.js";
import {
  addDigitalActivityItem,
  getDigitalActivityPublishReadiness,
  publishDigitalActivity,
  removeDigitalActivityItem,
  reorderDigitalActivityItems,
  updateDigitalActivity,
  type DigitalActivityAuditContext,
} from "../src/services/digitalActivity.service.js";

type MutableItemState = {
  id: string;
  questionBankItemId: string;
  sequence: number;
  marks: number | null;
  configuration: unknown;
  sectionKey: string | null;
  isRequired: boolean;
};

type MutableReviewHistoryState = {
  id: string;
  fromStatus: DigitalActivityStatus;
  toStatus: DigitalActivityStatus;
  comment: string | null;
  createdAt: Date;
};

type MutableActivityState = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  instructions: string;
  learningOutcome: string | null;
  programmeId: string;
  activityTemplateId: string;
  createdByUserId: string;
  updatedByUserId: string | null;
  difficulty: LearningDifficulty;
  status: DigitalActivityStatus;
  scoringMode: ActivityScoringMode;
  reviewMode: ActivityReviewMode;
  totalMarks: number | null;
  masteryThreshold: number | null;
  estimatedMinutes: number | null;
  attemptsAllowed: number | null;
  timeLimitSeconds: number | null;
  shuffleItems: boolean;
  showImmediateFeedback: boolean;
  allowRetry: boolean;
  configuration: unknown;
  rewardConfiguration: unknown | null;
  presentationSettings: unknown | null;
  settingsCompletedAt: Date | null;
  submittedForReviewAt: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: MutableItemState[];
  reviewHistory: MutableReviewHistoryState[];
};

const programmeId = "11111111-1111-4111-8111-111111111111";
const templateId = "22222222-2222-4222-8222-222222222222";
const actorUserId = "33333333-3333-4333-8333-333333333333";
const fixedNow = new Date("2026-08-10T12:00:00.000Z");

const context: DigitalActivityAuditContext = {
  actor: {
    userId: actorUserId,
    profileId: "44444444-4444-4444-8444-444444444444",
    role: UserRole.SUPER_ADMIN,
    schoolId: null,
    name: "Regression Auditor",
    isFirstLogin: false,
  },
  requestIp: "127.0.0.1",
  userAgent: "node-test",
};

function questionConfiguration(): unknown {
  return {
    arrangeSyllables: {
      mode: "MISSING_SYLLABLES",
      interactionMode: "DRAG_TO_BLANK",
      words: [
        {
          id: "WORD-1",
          sequence: 1,
          syllables: [
            { id: "SYL-1", value: "CA", sequence: 1, isMissing: false },
            { id: "SYL-2", value: "WAN", sequence: 2, isMissing: true },
          ],
        },
      ],
      distractors: [
        { id: "D1", value: "WAN", sequence: 1 },
        { id: "D2", value: "KI", sequence: 2 },
      ],
      hint: "Dengar bunyi akhir perkataan.",
      showReferenceText: false,
      allowRetry: true,
      clearOnRetry: false,
      maximumSyllables: 10,
    },
  };
}

function activityConfiguration(): unknown {
  return {
    shuffleSyllables: true,
    showReferenceImage: false,
    playReferenceAudio: false,
    attemptsAllowed: 1,
  };
}

function buildQuestionBankItem(id: string) {
  return {
    id,
    type: QuestionBankItemType.WORD,
    title: "Cawan",
    content: "Cawan",
    answerType: QuestionAnswerType.SINGLE_CHOICE,
    correctAnswer: "WAN",
    difficulty: LearningDifficulty.BASIC,
    status: QuestionBankStatus.ACTIVE,
    programmeId,
    mediaLinks: [],
  };
}

function createActivityState(itemMarks: number[], totalMarks = 100): MutableActivityState {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    code: "AKT-UJI-0001",
    title: "Seret Suku Kata",
    description: null,
    instructions: "Lengkapkan perkataan dengan suku kata yang betul.",
    learningOutcome: null,
    programmeId,
    activityTemplateId: templateId,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
    difficulty: LearningDifficulty.BASIC,
    status: DigitalActivityStatus.DRAFT,
    scoringMode: ActivityScoringMode.TOTAL_SCORE,
    reviewMode: ActivityReviewMode.AUTO,
    totalMarks,
    masteryThreshold: null,
    estimatedMinutes: 10,
    attemptsAllowed: null,
    timeLimitSeconds: null,
    shuffleItems: true,
    showImmediateFeedback: true,
    allowRetry: true,
    configuration: activityConfiguration(),
    rewardConfiguration: null,
    presentationSettings: null,
    settingsCompletedAt: fixedNow,
    submittedForReviewAt: null,
    publishedAt: null,
    archivedAt: null,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    items: itemMarks.map((marks, index) => ({
      id: `item-${index + 1}`,
      questionBankItemId: `qb-${index + 1}`,
      sequence: index,
      marks,
      configuration: questionConfiguration(),
      sectionKey: null,
      isRequired: true,
    })),
    reviewHistory: [],
  };
}

function buildRecord(state: MutableActivityState) {
  return {
    ...state,
    programme: {
      id: programmeId,
      code: "PROG-1",
      name: "Pemulihan Khas",
      curriculumVersion: {
        id: "curriculum-version-1",
        code: "KSPK-1",
        name: "Versi Terbit",
        status: CurriculumStatus.PUBLISHED,
      },
    },
    activityTemplate: {
      id: templateId,
      code: "ARRANGE_SYLLABLES",
      name: "Arrange Syllables",
      description: "Susun suku kata menjadi perkataan yang betul.",
      category: ActivityTemplateCategory.ARRANGEMENT,
      version: 1,
      status: ActivityTemplateStatus.ACTIVE,
      assessmentMode: AssessmentMode.AUTO,
      requiresTeacherReview: false,
      supportsAutoMarking: true,
      supportsMedia: true,
      supportsAudio: true,
      supportsVideo: false,
      supportsDrawing: false,
      supportsVoiceRecording: false,
      supportsFutureAI: false,
      rendererKey: "arrange-syllables",
      configurationSchema: {
        type: "object",
        title: "Activity configuration",
        properties: {
          shuffleSyllables: { type: "boolean", default: true },
          showReferenceImage: { type: "boolean", default: false },
          playReferenceAudio: { type: "boolean", default: false },
          attemptsAllowed: { type: "number", minimum: 1, maximum: 10, default: 1 },
        },
      },
      contentSchema: {},
      acceptedItemTypes: [
        { id: "accepted-1", activityTemplateId: templateId, itemType: QuestionBankItemType.WORD, isRequired: true, minimumItems: 1, maximumItems: null, createdAt: fixedNow },
      ],
    },
    createdBy: {
      id: actorUserId,
      role: UserRole.SUPER_ADMIN,
      admin: { fullName: "Regression Auditor" },
      teacher: null,
    },
    updatedBy: {
      id: actorUserId,
      role: UserRole.SUPER_ADMIN,
      admin: { fullName: "Regression Auditor" },
      teacher: null,
    },
    curriculumLinks: [
      {
        id: "link-1",
        digitalActivityId: state.id,
        curriculumYearId: "year-1",
        languageStructureId: null,
        remedialSkillId: "skill-1",
        contentStandardId: "content-1",
        learningStandardId: "learning-1",
        learningObjectiveId: "objective-1",
        isPrimary: true,
        createdAt: fixedNow,
        curriculumYear: { id: "year-1", programmeId, yearLevel: 2, name: "Tahun 2", sequence: 1, status: CurriculumStatus.PUBLISHED, createdAt: fixedNow, updatedAt: fixedNow },
        languageStructure: null,
        remedialSkill: { id: "skill-1", programmeId, languageStructureId: "structure-1", code: "KP1", sequence: 1, name: "Prabacaan", description: "Kemahiran", isPreparatory: false, status: CurriculumStatus.PUBLISHED, createdAt: fixedNow, updatedAt: fixedNow },
        contentStandard: { id: "content-1", programmeId, curriculumYearId: "year-1", code: "SK1", title: "Standard Kandungan", description: "Standard", domain: "MEMBACA", sequence: 1, status: CurriculumStatus.PUBLISHED, createdAt: fixedNow, updatedAt: fixedNow },
        learningStandard: { id: "learning-1", contentStandardId: "content-1", code: "SP1", description: "Standard Pembelajaran", sequence: 1, status: CurriculumStatus.PUBLISHED, createdAt: fixedNow, updatedAt: fixedNow },
        learningObjective: { id: "objective-1", remedialSkillId: "skill-1", code: "OP1", description: "Objektif", sequence: 1, status: CurriculumStatus.PUBLISHED, createdAt: fixedNow, updatedAt: fixedNow },
      },
    ],
    items: state.items
      .slice()
      .sort((left, right) => left.sequence - right.sequence)
      .map((item) => ({
        ...item,
        createdAt: fixedNow,
        updatedAt: fixedNow,
        digitalActivityId: state.id,
        questionBankItem: buildQuestionBankItem(item.questionBankItemId),
      })),
    mediaLinks: [],
    reviewHistory: state.reviewHistory.map((entry) => ({
      ...entry,
      digitalActivityId: state.id,
      actorUserId: actorUserId,
      actor: {
        id: actorUserId,
        role: UserRole.SUPER_ADMIN,
        admin: { fullName: "Regression Auditor" },
        teacher: null,
      },
    })),
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createHarness(initialItemMarks: number[], totalMarks = 100) {
  const state = createActivityState(initialItemMarks, totalMarks);
  let nextItemId = state.items.length + 1;
  let nextReviewHistoryId = 1;

  const original = {
    digitalActivityFindUnique: prisma.digitalActivity.findUnique,
    digitalActivityFindUniqueOrThrow: prisma.digitalActivity.findUniqueOrThrow,
    digitalActivityUpdate: prisma.digitalActivity.update,
    digitalActivityItemFindMany: prisma.digitalActivityItem.findMany,
    digitalActivityItemFindFirst: prisma.digitalActivityItem.findFirst,
    digitalActivityItemFindUniqueOrThrow: prisma.digitalActivityItem.findUniqueOrThrow,
    digitalActivityItemUpdate: prisma.digitalActivityItem.update,
    digitalActivityItemCreate: prisma.digitalActivityItem.create,
    digitalActivityItemDelete: prisma.digitalActivityItem.delete,
    questionBankItemFindUnique: prisma.questionBankItem.findUnique,
    auditLogCreate: prisma.auditLog.create,
    transaction: prisma.$transaction,
  };

  const tx = {
    digitalActivity: {
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        assert.equal(args.where.id, state.id);
        Object.assign(state, clone(args.data));
        state.updatedAt = fixedNow;
        return buildRecord(state);
      },
      findUniqueOrThrow: async (args: { where: { id: string } }) => {
        assert.equal(args.where.id, state.id);
        return buildRecord(state);
      },
    },
    digitalActivityItem: {
      findMany: async () => state.items
        .slice()
        .sort((left, right) => left.sequence - right.sequence)
        .map((item) => ({ id: item.id, sequence: item.sequence })),
      update: async (args: { where: { id: string }; data: Partial<MutableItemState> }) => {
        const item = state.items.find((entry) => entry.id === args.where.id);
        assert.ok(item, `Expected item ${args.where.id} to exist`);
        Object.assign(item, clone(args.data));
        return { ...item, digitalActivityId: state.id, createdAt: fixedNow, updatedAt: fixedNow };
      },
      create: async (args: { data: { questionBankItemId: string; sequence: number; sectionKey: string | null; isRequired: boolean; marks: number | null; configuration: unknown; digitalActivityId: string } }) => {
        const created: MutableItemState = {
          id: `item-${nextItemId}`,
          questionBankItemId: args.data.questionBankItemId,
          sequence: args.data.sequence,
          marks: args.data.marks,
          configuration: clone(args.data.configuration),
          sectionKey: args.data.sectionKey,
          isRequired: args.data.isRequired,
        };
        nextItemId += 1;
        state.items.push(created);
        return { ...created, digitalActivityId: state.id, createdAt: fixedNow, updatedAt: fixedNow };
      },
      findUniqueOrThrow: async (args: { where: { id: string } }) => {
        const item = state.items.find((entry) => entry.id === args.where.id);
        assert.ok(item, `Expected item ${args.where.id} to exist`);
        return { ...item, digitalActivityId: state.id, createdAt: fixedNow, updatedAt: fixedNow };
      },
      delete: async (args: { where: { id: string } }) => {
        const index = state.items.findIndex((entry) => entry.id === args.where.id);
        assert.notEqual(index, -1);
        const [removed] = state.items.splice(index, 1);
        return { ...removed!, digitalActivityId: state.id, createdAt: fixedNow, updatedAt: fixedNow };
      },
    },
    digitalActivityReviewHistory: {
      create: async (args: { data: { fromStatus: DigitalActivityStatus; toStatus: DigitalActivityStatus; comment?: string | null } }) => {
        state.reviewHistory.push({
          id: `history-${nextReviewHistoryId}`,
          fromStatus: args.data.fromStatus,
          toStatus: args.data.toStatus,
          comment: args.data.comment ?? null,
          createdAt: fixedNow,
        });
        nextReviewHistoryId += 1;
        return state.reviewHistory.at(-1)!;
      },
    },
    auditLog: {
      create: async () => ({ id: "audit-1" }),
    },
  };

  prisma.digitalActivity.findUnique = (async (args: { where: { id: string } }) => {
    if (args.where.id !== state.id) return null;
    return buildRecord(state);
  }) as typeof prisma.digitalActivity.findUnique;
  prisma.digitalActivity.findUniqueOrThrow = (async (args: { where: { id: string } }) => {
    assert.equal(args.where.id, state.id);
    return buildRecord(state);
  }) as typeof prisma.digitalActivity.findUniqueOrThrow;
  prisma.digitalActivity.update = tx.digitalActivity.update as typeof prisma.digitalActivity.update;
  prisma.digitalActivityItem.findMany = (async () => state.items
    .slice()
    .sort((left, right) => left.sequence - right.sequence)
    .map((item) => ({ ...item, digitalActivityId: state.id, createdAt: fixedNow, updatedAt: fixedNow, questionBankItem: buildQuestionBankItem(item.questionBankItemId) }))) as typeof prisma.digitalActivityItem.findMany;
  prisma.digitalActivityItem.findFirst = (async (args: { where: { id: string; digitalActivityId: string } }) => {
    if (args.where.digitalActivityId !== state.id) return null;
    const item = state.items.find((entry) => entry.id === args.where.id);
    return item ? { ...item, digitalActivityId: state.id, createdAt: fixedNow, updatedAt: fixedNow } : null;
  }) as typeof prisma.digitalActivityItem.findFirst;
  prisma.digitalActivityItem.findUniqueOrThrow = tx.digitalActivityItem.findUniqueOrThrow as typeof prisma.digitalActivityItem.findUniqueOrThrow;
  prisma.digitalActivityItem.update = tx.digitalActivityItem.update as typeof prisma.digitalActivityItem.update;
  prisma.digitalActivityItem.create = tx.digitalActivityItem.create as typeof prisma.digitalActivityItem.create;
  prisma.digitalActivityItem.delete = tx.digitalActivityItem.delete as typeof prisma.digitalActivityItem.delete;
  prisma.questionBankItem.findUnique = (async (args: { where: { id: string } }) => {
    if (!state.items.some((item) => item.questionBankItemId === args.where.id) && !args.where.id.startsWith("qb-")) {
      return null;
    }
    return buildQuestionBankItem(args.where.id);
  }) as typeof prisma.questionBankItem.findUnique;
  prisma.auditLog.create = (async () => ({ id: "audit-1" })) as typeof prisma.auditLog.create;
  prisma.$transaction = (async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx)) as typeof prisma.$transaction;

  return {
    state,
    async restore() {
      prisma.digitalActivity.findUnique = original.digitalActivityFindUnique;
      prisma.digitalActivity.findUniqueOrThrow = original.digitalActivityFindUniqueOrThrow;
      prisma.digitalActivity.update = original.digitalActivityUpdate;
      prisma.digitalActivityItem.findMany = original.digitalActivityItemFindMany;
      prisma.digitalActivityItem.findFirst = original.digitalActivityItemFindFirst;
      prisma.digitalActivityItem.findUniqueOrThrow = original.digitalActivityItemFindUniqueOrThrow;
      prisma.digitalActivityItem.update = original.digitalActivityItemUpdate;
      prisma.digitalActivityItem.create = original.digitalActivityItemCreate;
      prisma.digitalActivityItem.delete = original.digitalActivityItemDelete;
      prisma.questionBankItem.findUnique = original.questionBankItemFindUnique;
      prisma.auditLog.create = original.auditLogCreate;
      prisma.$transaction = original.transaction;
    },
  };
}

test("legacy scoring mismatch self-heals through the real Step 4 save service path", async () => {
  const harness = createHarness([1]);

  try {
    await updateDigitalActivity(harness.state.id, { totalMarks: 100 }, context);

    assert.equal(harness.state.totalMarks, 100);
    assert.deepEqual(harness.state.items.map((item) => item.marks), [100]);
    assert.equal(harness.state.items.reduce((sum, item) => sum + (item.marks ?? 0), 0), 100);
  } finally {
    await harness.restore();
  }
});

test("publish readiness changes from scoring-invalid to ready after a real Step 4 resave", async () => {
  const harness = createHarness([1]);

  try {
    const before = await getDigitalActivityPublishReadiness(harness.state.id, context);
    assert.equal(before.ready, false);
    assert.ok(before.issues.includes("SCORING_INVALID"));

    await updateDigitalActivity(harness.state.id, { totalMarks: 100 }, context);

    const after = await getDigitalActivityPublishReadiness(harness.state.id, context);
    assert.deepEqual(harness.state.items.map((item) => item.marks), [100]);
    assert.equal(after.ready, true);
    assert.deepEqual(after.issues, []);
  } finally {
    await harness.restore();
  }
});

test("publish succeeds after Step 4 synchronization when scoring mismatch was the only blocker", async () => {
  const harness = createHarness([1]);

  try {
    await updateDigitalActivity(harness.state.id, { totalMarks: 100 }, context);
    const published = await publishDigitalActivity(harness.state.id, context);

    assert.equal(harness.state.status, DigitalActivityStatus.PUBLISHED);
    assert.equal(published.status, DigitalActivityStatus.PUBLISHED);
    assert.deepEqual(harness.state.items.map((item) => item.marks), [100]);
  } finally {
    await harness.restore();
  }
});

test("adding an item persists deterministic 50/50 scoring for a 100-mark activity", async () => {
  const harness = createHarness([100]);

  try {
    await addDigitalActivityItem(harness.state.id, {
      questionBankItemId: "qb-2",
      sequence: 1,
      sectionKey: null,
      isRequired: true,
      marks: null,
      configuration: questionConfiguration(),
    }, context);

    assert.deepEqual(
      harness.state.items.slice().sort((left, right) => left.sequence - right.sequence).map((item) => item.marks),
      [50, 50],
    );
    assert.equal(harness.state.items.reduce((sum, item) => sum + (item.marks ?? 0), 0), 100);
  } finally {
    await harness.restore();
  }
});

test("deleting an item restores the remaining item to the full 100 marks", async () => {
  const harness = createHarness([50, 50]);

  try {
    await removeDigitalActivityItem(harness.state.id, "item-2", context);

    assert.deepEqual(harness.state.items.map((item) => item.marks), [100]);
    assert.equal(harness.state.items.reduce((sum, item) => sum + (item.marks ?? 0), 0), 100);
  } finally {
    await harness.restore();
  }
});

test("reordering items preserves all items and keeps the exact synchronized total", async () => {
  const harness = createHarness([34, 33, 33]);

  try {
    await reorderDigitalActivityItems(harness.state.id, ["item-3", "item-1", "item-2"], context);

    const ordered = harness.state.items.slice().sort((left, right) => left.sequence - right.sequence);
    assert.deepEqual(ordered.map((item) => item.id), ["item-3", "item-1", "item-2"]);
    assert.deepEqual(ordered.map((item) => item.marks), [34, 33, 33]);
    assert.equal(new Set(ordered.map((item) => item.id)).size, 3);
    assert.equal(ordered.reduce((sum, item) => sum + (item.marks ?? 0), 0), 100);
  } finally {
    await harness.restore();
  }
});
