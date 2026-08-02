import { ActivityReviewMode, ActivityScoringMode, ActivityTemplateStatus, CurriculumStatus, DigitalActivityStatus, Prisma, QuestionBankStatus, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { ArrangeLettersContractError, arrangeLettersAuditSummary, arrangeLettersPreviewConfiguration, validateArrangeLettersConfiguration, type ArrangeLettersConfiguration } from "../contracts/arrange-letters.contract.js";
import { ArrangeSyllablesContractError, arrangeSyllablesAuditSummary, arrangeSyllablesPreviewConfiguration, validateArrangeSyllablesConfiguration, type ArrangeSyllablesConfiguration } from "../contracts/arrange-syllables.contract.js";
import { CopyWritingContractError, copyWritingAuditSummary, copyWritingMediaKeys, copyWritingPreviewConfiguration, validateCopyWritingConfiguration, validateCopyWritingMedia, type CopyWritingConfiguration, type CopyWritingPreviewMediaDescriptor } from "../contracts/copy-writing.contract.js";
import { FillBlankContractError, fillBlankAuditSummary, fillBlankMediaKeys, fillBlankPreviewConfiguration, validateFillBlankConfiguration, validateFillBlankMedia, type FillBlankConfiguration, type FillBlankPreviewMediaDescriptor } from "../contracts/fill-blank.contract.js";
import { FreeHandwritingContractError, freeHandwritingAuditSummary, freeHandwritingMediaKeys, freeHandwritingPreviewConfiguration, validateFreeHandwritingConfiguration, validateFreeHandwritingMedia, type FreeHandwritingConfiguration, type FreeHandwritingPreviewMediaDescriptor } from "../contracts/free-handwriting.contract.js";
import { ReadingContractError, readingAuditSummary, readingMediaKeys, readingPreviewConfiguration, validateReadingConfiguration, validateReadingMedia, type ReadingConfiguration, type ReadingPreviewMediaDescriptor } from "../contracts/reading.contract.js";
import { ReadingComprehensionContractError, readingComprehensionAuditSummary, readingComprehensionMediaKeys, readingComprehensionPreviewConfiguration, validateReadingComprehensionConfiguration, validateReadingComprehensionMedia, type ReadingComprehensionConfiguration, type ReadingComprehensionPreviewMediaDescriptor } from "../contracts/reading-comprehension.contract.js";
import { TracingContractError, tracingAuditSummary, tracingPreviewConfiguration, validateTracingConfiguration, type TracingConfiguration } from "../contracts/tracing.contract.js";
import { WordBuilderContractError, wordBuilderAuditSummary, wordBuilderMediaKeys, wordBuilderPreviewConfiguration, validateWordBuilderConfiguration, validateWordBuilderMedia, type WordBuilderConfiguration, type WordBuilderPreviewMediaDescriptor } from "../contracts/word-builder.contract.js";
import { VoiceRecordingContractError, voiceRecordingAuditSummary, voiceRecordingMediaKeys, voiceRecordingPreviewConfiguration, validateVoiceRecordingConfiguration, validateVoiceRecordingMedia, type VoiceRecordingConfiguration, type VoiceRecordingPreviewMediaDescriptor } from "../contracts/voice-recording.contract.js";
import { assertSafeStorageKey } from "../storage/local-storage.adapter.js";
import { getStorageAdapter } from "../storage/storage.service.js";
import { assertSafeMetadata, jsonByteSize } from "../utils/safe-json-schema.js";
import type { AddDigitalActivityItemBody, AddDigitalActivityMediaBody, CreateDigitalActivityBody, CreateDigitalActivityCurriculumLinkBody, ListDigitalActivitiesQuery, UpdateDigitalActivityBody, UpdateDigitalActivityItemBody } from "../validators/digitalActivity.validator.js";
import { recordAuditEvent, type AuditEvent } from "./audit.service.js";

export interface DigitalActivityAuditContext { actor: AuthenticatedSession & { name?: string | null }; requestIp?: string | null; userAgent?: string | null; }
const include = { programme: { select: { id: true, code: true, name: true, curriculumVersion: { select: { id: true, code: true, name: true, status: true } } } }, activityTemplate: { include: { acceptedItemTypes: true } }, createdBy: { select: { id: true, role: true, admin: { select: { fullName: true } }, teacher: { select: { fullName: true } } } }, updatedBy: { select: { id: true, role: true, admin: { select: { fullName: true } }, teacher: { select: { fullName: true } } } }, curriculumLinks: { include: { curriculumYear: true, languageStructure: true, remedialSkill: true, contentStandard: true, learningStandard: true, learningObjective: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }, items: { include: { questionBankItem: { select: { id: true, type: true, title: true, content: true, answerType: true, correctAnswer: true, difficulty: true, status: true, programmeId: true, mediaLinks: true } } }, orderBy: { sequence: "asc" } }, mediaLinks: { orderBy: [{ mediaRole: "asc" }, { sequence: "asc" }] }, reviewHistory: { include: { actor: { select: { id: true, role: true, admin: { select: { fullName: true } }, teacher: { select: { fullName: true } } } } }, orderBy: { createdAt: "asc" } } } satisfies Prisma.DigitalActivityInclude;
type ActivityRecord = Prisma.DigitalActivityGetPayload<{ include: typeof include }>;
const previewInclude = { programme: { select: { curriculumVersion: { select: { status: true } } } }, activityTemplate: { select: { id: true, code: true, version: true, name: true, category: true, assessmentMode: true, rendererKey: true, requiresTeacherReview: true, supportsFutureAI: true, supportsAutoMarking: true, supportsMedia: true, supportsAudio: true, supportsVideo: true, supportsDrawing: true, supportsVoiceRecording: true, configurationSchema: true } }, items: { include: { questionBankItem: { select: { id: true, type: true, title: true, content: true, normalizedText: true, languagePattern: true, instructions: true, explanation: true, answerType: true, correctAnswer: true, difficulty: true, metadata: true, status: true, programmeId: true, answerOptions: { orderBy: { sequence: "asc" } }, mediaLinks: { orderBy: [{ mediaRole: "asc" }, { sequence: "asc" }] } } } }, orderBy: { sequence: "asc" } }, mediaLinks: { orderBy: [{ mediaRole: "asc" }, { sequence: "asc" }] } } satisfies Prisma.DigitalActivityInclude;
type PreviewActivityRecord = Prisma.DigitalActivityGetPayload<{ include: typeof previewInclude }>;

const imageRoles = new Set(["COVER_IMAGE", "INSTRUCTION_IMAGE", "MASCOT_IMAGE"]);
const audioRoles = new Set(["INSTRUCTION_AUDIO", "BACKGROUND_AUDIO", "REFERENCE_AUDIO", "REWARD_SOUND"]);
const videoRoles = new Set(["INTRO_VIDEO", "REFERENCE_VIDEO"]);
const supportedExtensions = { image: new Set(["jpg", "jpeg", "png", "webp"]), audio: new Set(["mp3", "wav", "ogg", "m4a", "mp4"]), video: new Set(["mp4", "webm"]) };

function error(code: string, status: number, message: string, details?: unknown): AppError { return new AppError(code, status, message, details); }
function notFound(): AppError { return error("DIGITAL_ACTIVITY_NOT_FOUND", 404, "Aktiviti digital tidak ditemui."); }
function denied(): AppError { return error("DIGITAL_ACTIVITY_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses aktiviti digital."); }
function editable(): AppError { return error("DIGITAL_ACTIVITY_NOT_EDITABLE", 409, "Aktiviti digital tidak boleh diubah pada status semasa."); }
function transition(): AppError { return error("DIGITAL_ACTIVITY_STATUS_TRANSITION_INVALID", 409, "Peralihan status aktiviti digital tidak sah."); }
function unique(caught: unknown): boolean { return caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === "P2002"; }
function manage(context: DigitalActivityAuditContext): void { if (context.actor.role !== UserRole.SUPER_ADMIN && context.actor.role !== UserRole.ADMIN) throw denied(); }
function read(context: DigitalActivityAuditContext): void { if (context.actor.role !== UserRole.SUPER_ADMIN && context.actor.role !== UserRole.ADMIN && context.actor.role !== UserRole.TEACHER) throw denied(); }
function superAdmin(context: DigitalActivityAuditContext): void { if (context.actor.role !== UserRole.SUPER_ADMIN) throw denied(); }
function asRecord(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function safeJson(value: unknown, code: string, maxBytes: number): Prisma.InputJsonValue { if (value === null || jsonByteSize(value) > maxBytes) throw error(code, 400, "Konfigurasi aktiviti terlalu besar."); try { assertSafeMetadata(value); } catch { throw error(code, 400, "Konfigurasi aktiviti tidak selamat."); } return value as Prisma.InputJsonValue; }
function nullableSafeJson(value: unknown | null, code: string, maxBytes: number): Prisma.InputJsonValue | Prisma.JsonNullValueInput { return value === null ? Prisma.JsonNull : safeJson(value, code, maxBytes); }
function actorName(user: { admin: { fullName: string } | null; teacher: { fullName: string } | null }): string | null { return user.admin?.fullName ?? user.teacher?.fullName ?? null; }
function audit(context: DigitalActivityAuditContext, action: AuditEvent["action"], resourceId: string, before: unknown, after: unknown): AuditEvent { return { actorUserId: context.actor.userId, actorProfileId: context.actor.profileId, actorRole: context.actor.role, actorName: context.actor.name ?? null, action, resourceType: "DIGITAL_ACTIVITY", resourceId, schoolId: null, before, after, timestamp: new Date(), requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null }; }
function safeAudit(record: ActivityRecord) { return { id: record.id, code: record.code, status: record.status, programmeId: record.programmeId, templateId: record.activityTemplateId, itemCount: record.items.length, curriculumLinkCount: record.curriculumLinks.length }; }
function dto(record: ActivityRecord) { return { id: record.id, code: record.code, title: record.title, description: record.description, instructions: record.instructions, learningOutcome: record.learningOutcome, difficulty: record.difficulty, status: record.status, scoringMode: record.scoringMode, reviewMode: record.reviewMode, totalMarks: record.totalMarks, masteryThreshold: record.masteryThreshold, estimatedMinutes: record.estimatedMinutes, attemptsAllowed: record.attemptsAllowed, timeLimitSeconds: record.timeLimitSeconds, shuffleItems: record.shuffleItems, showImmediateFeedback: record.showImmediateFeedback, allowRetry: record.allowRetry, configuration: record.configuration, rewardConfiguration: record.rewardConfiguration, presentationSettings: record.presentationSettings, submittedForReviewAt: record.submittedForReviewAt, publishedAt: record.publishedAt, archivedAt: record.archivedAt, createdAt: record.createdAt, updatedAt: record.updatedAt, programme: { id: record.programme.id, code: record.programme.code, name: record.programme.name, version: record.programme.curriculumVersion }, template: { id: record.activityTemplate.id, code: record.activityTemplate.code, name: record.activityTemplate.name, version: record.activityTemplate.version, rendererKey: record.activityTemplate.rendererKey, status: record.activityTemplate.status }, creator: { userId: record.createdBy.id, role: record.createdBy.role, name: actorName(record.createdBy) }, updater: record.updatedBy ? { userId: record.updatedBy.id, role: record.updatedBy.role, name: actorName(record.updatedBy) } : null, curriculumLinks: record.curriculumLinks.map((link) => ({ id: link.id, isPrimary: link.isPrimary, curriculumYear: link.curriculumYear ? { id: link.curriculumYear.id, yearLevel: link.curriculumYear.yearLevel, name: link.curriculumYear.name } : null, languageStructure: link.languageStructure ? { id: link.languageStructure.id, code: link.languageStructure.code, name: link.languageStructure.name } : null, remedialSkill: link.remedialSkill ? { id: link.remedialSkill.id, code: link.remedialSkill.code, name: link.remedialSkill.name } : null, contentStandard: link.contentStandard ? { id: link.contentStandard.id, code: link.contentStandard.code, title: link.contentStandard.title } : null, learningStandard: link.learningStandard ? { id: link.learningStandard.id, code: link.learningStandard.code } : null, learningObjective: link.learningObjective ? { id: link.learningObjective.id, code: link.learningObjective.code, description: link.learningObjective.description } : null })), items: record.items.map((item) => ({ id: item.id, sequence: item.sequence, sectionKey: item.sectionKey, isRequired: item.isRequired, marks: item.marks, configuration: item.configuration, questionBankItem: item.questionBankItem })), media: record.mediaLinks.map((media) => ({ id: media.id, mediaKey: media.mediaKey, mediaRole: media.mediaRole, mimeType: media.mimeType, label: media.label, altText: media.altText, sequence: media.sequence, isPrimary: media.isPrimary, url: getStorageAdapter().getPublicUrl(media.mediaKey) })), reviewHistory: record.reviewHistory.map((history) => ({ id: history.id, fromStatus: history.fromStatus, toStatus: history.toStatus, comment: history.comment, createdAt: history.createdAt, actor: { userId: history.actor.id, role: history.actor.role, name: actorName(history.actor) } })) }; }
async function get(activityId: string): Promise<ActivityRecord> { const record = await prisma.digitalActivity.findUnique({ where: { id: activityId }, include }); if (!record) throw notFound(); return record; }
async function getPreview(activityId: string): Promise<PreviewActivityRecord> { const record = await prisma.digitalActivity.findUnique({ where: { id: activityId }, include: previewInclude }); if (!record) throw notFound(); return record; }
function visible(record: { status: DigitalActivityStatus; programme: { curriculumVersion: { status: CurriculumStatus } } }, context: DigitalActivityAuditContext): void { read(context); if (context.actor.role === UserRole.TEACHER && (record.status !== DigitalActivityStatus.PUBLISHED || record.programme.curriculumVersion.status !== CurriculumStatus.PUBLISHED)) throw notFound(); }
function draft(record: ActivityRecord): void { if (record.status !== DigitalActivityStatus.DRAFT) throw editable(); }

function fillBlankIssues(caught: unknown): readonly string[] { return caught instanceof FillBlankContractError ? caught.issues : ["FILL_BLANK_CONFIGURATION_INVALID"]; }
function fillBlankItemInvalid(caught: unknown): AppError { return error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Kontrak Fill in the Blank tidak sah.", { issues: fillBlankIssues(caught) }); }
function arrangeLettersIssues(caught: unknown): readonly string[] { return caught instanceof ArrangeLettersContractError ? caught.issues : ["ARRANGE_LETTERS_CONFIGURATION_INVALID"]; }
function arrangeLettersItemInvalid(caught: unknown): AppError { return error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Kontrak Arrange Letters tidak sah.", { issues: arrangeLettersIssues(caught) }); }
function arrangeSyllablesIssues(caught: unknown): readonly string[] { return caught instanceof ArrangeSyllablesContractError ? caught.issues : ["ARRANGE_SYLLABLES_CONFIGURATION_INVALID"]; }
function arrangeSyllablesItemInvalid(caught: unknown): AppError { return error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Kontrak Arrange Syllables tidak sah.", { issues: arrangeSyllablesIssues(caught) }); }
function wordBuilderIssues(caught: unknown): readonly string[] { return caught instanceof WordBuilderContractError ? caught.issues : ["WORD_BUILDER_CONFIGURATION_INVALID"]; }
function wordBuilderItemInvalid(caught: unknown): AppError { return error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Kontrak Word Builder tidak sah.", { issues: wordBuilderIssues(caught) }); }
function tracingIssues(caught: unknown): readonly string[] { return caught instanceof TracingContractError ? caught.issues : ["TRACING_CONFIGURATION_INVALID"]; }
function tracingItemInvalid(caught: unknown): AppError { return error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Kontrak Tracing tidak sah.", { issues: tracingIssues(caught) }); }
function copyWritingIssues(caught: unknown): readonly string[] { return caught instanceof CopyWritingContractError ? caught.issues : ["COPY_WRITING_CONTRACT_REQUIRED"]; }
function copyWritingItemInvalid(caught: unknown): AppError { return error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Kontrak Copy Writing tidak sah.", { issues: copyWritingIssues(caught) }); }
function readingIssues(caught: unknown): readonly string[] { return caught instanceof ReadingContractError ? caught.issues : ["READING_CONTRACT_REQUIRED"]; }
function readingItemInvalid(caught: unknown): AppError { return error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Kontrak Reading tidak sah.", { issues: readingIssues(caught) }); }
function freeHandwritingIssues(caught: unknown): readonly string[] { return caught instanceof FreeHandwritingContractError ? caught.issues : ["FREE_HANDWRITING_CONTRACT_REQUIRED"]; }
function freeHandwritingItemInvalid(caught: unknown): AppError { return error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Kontrak Free Handwriting tidak sah.", { issues: freeHandwritingIssues(caught) }); }
function readingComprehensionIssues(caught: unknown): readonly string[] { return caught instanceof ReadingComprehensionContractError ? caught.issues : ["READING_COMPREHENSION_CONTRACT_REQUIRED"]; }
function readingComprehensionItemInvalid(caught: unknown): AppError { return error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Kontrak Reading Comprehension tidak sah.", { issues: readingComprehensionIssues(caught) }); }
function voiceRecordingIssues(caught: unknown): readonly string[] { return caught instanceof VoiceRecordingContractError ? caught.issues : ["VOICE_RECORDING_CONTRACT_REQUIRED"]; }
function voiceRecordingItemInvalid(caught: unknown): AppError { return error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Kontrak Voice Recording tidak sah.", { issues: voiceRecordingIssues(caught) }); }
interface ValidatedActivityItemContract { fillBlank: FillBlankConfiguration | null; arrangeLetters: ArrangeLettersConfiguration | null; arrangeSyllables: ArrangeSyllablesConfiguration | null; wordBuilder: WordBuilderConfiguration | null; tracing: TracingConfiguration | null; copyWriting: CopyWritingConfiguration | null; reading: ReadingConfiguration | null; freeHandwriting?: FreeHandwritingConfiguration | null; readingComprehension?: ReadingComprehensionConfiguration | null; voiceRecording?: VoiceRecordingConfiguration | null; }
function itemContractAudit(contract: ValidatedActivityItemContract): Record<string, unknown> { return { ...(contract.fillBlank ? { fillBlank: fillBlankAuditSummary(contract.fillBlank) } : {}), ...(contract.arrangeLetters ? { arrangeLetters: arrangeLettersAuditSummary(contract.arrangeLetters) } : {}), ...(contract.arrangeSyllables ? { arrangeSyllables: arrangeSyllablesAuditSummary(contract.arrangeSyllables) } : {}), ...(contract.wordBuilder ? { wordBuilder: wordBuilderAuditSummary(contract.wordBuilder) } : {}), ...(contract.tracing ? { tracing: tracingAuditSummary(contract.tracing) } : {}), ...(contract.copyWriting ? { copyWriting: copyWritingAuditSummary(contract.copyWriting) } : {}), ...(contract.reading ? { reading: readingAuditSummary(contract.reading) } : {}), ...(contract.freeHandwriting ? { freeHandwriting: freeHandwritingAuditSummary(contract.freeHandwriting) } : {}), ...(contract.readingComprehension ? { readingComprehension: readingComprehensionAuditSummary(contract.readingComprehension) } : {}), ...(contract.voiceRecording ? { voiceRecording: voiceRecordingAuditSummary(contract.voiceRecording) } : {}) }; }
async function validateFillBlankItemConfiguration(value: unknown): Promise<FillBlankConfiguration> {
  let configuration: FillBlankConfiguration;
  try { configuration = validateFillBlankConfiguration(value); } catch (caught) { throw fillBlankItemInvalid(caught); }
  try {
    await validateFillBlankMedia(configuration, async (mediaKey) => {
      assertSafeStorageKey(mediaKey);
      if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found");
    });
  } catch (caught) { throw fillBlankItemInvalid(caught); }
  return configuration;
}
function validateArrangeLettersItemConfiguration(value: unknown): ArrangeLettersConfiguration {
  try { return validateArrangeLettersConfiguration(value); } catch (caught) { throw arrangeLettersItemInvalid(caught); }
}
function validateArrangeSyllablesItemConfiguration(value: unknown): ArrangeSyllablesConfiguration {
  try { return validateArrangeSyllablesConfiguration(value); } catch (caught) { throw arrangeSyllablesItemInvalid(caught); }
}
async function validateWordBuilderItemConfiguration(value: unknown): Promise<WordBuilderConfiguration> {
  let configuration: WordBuilderConfiguration;
  try { configuration = validateWordBuilderConfiguration(value); } catch (caught) { throw wordBuilderItemInvalid(caught); }
  try {
    await validateWordBuilderMedia(configuration, async (mediaKey) => {
      assertSafeStorageKey(mediaKey);
      if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found");
    });
  } catch (caught) { throw wordBuilderItemInvalid(caught); }
  return configuration;
}
function validateTracingItemConfiguration(value: unknown): TracingConfiguration {
  try { return validateTracingConfiguration(value); } catch (caught) { throw tracingItemInvalid(caught); }
}
async function validateCopyWritingItemConfiguration(value: unknown): Promise<CopyWritingConfiguration> {
  let configuration: CopyWritingConfiguration;
  try { configuration = validateCopyWritingConfiguration(value); } catch (caught) { throw copyWritingItemInvalid(caught); }
  try {
    await validateCopyWritingMedia(configuration, async (mediaKey) => {
      assertSafeStorageKey(mediaKey);
      if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found");
    });
  } catch (caught) { throw copyWritingItemInvalid(caught); }
  return configuration;
}
async function validateReadingItemConfiguration(value: unknown): Promise<ReadingConfiguration> {
  let configuration: ReadingConfiguration;
  try { configuration = validateReadingConfiguration(value); } catch (caught) { throw readingItemInvalid(caught); }
  try {
    await validateReadingMedia(configuration, async (mediaKey) => {
      assertSafeStorageKey(mediaKey);
      if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found");
    });
  } catch (caught) { throw readingItemInvalid(caught); }
  return configuration;
}
async function validateFreeHandwritingItemConfiguration(value: unknown): Promise<FreeHandwritingConfiguration> { let configuration: FreeHandwritingConfiguration; try { configuration = validateFreeHandwritingConfiguration(value); } catch (caught) { throw freeHandwritingItemInvalid(caught); } try { await validateFreeHandwritingMedia(configuration, async (mediaKey) => { assertSafeStorageKey(mediaKey); if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found"); }); } catch (caught) { throw freeHandwritingItemInvalid(caught); } return configuration; }
async function validateReadingComprehensionItemConfiguration(value: unknown): Promise<ReadingComprehensionConfiguration> { let configuration: ReadingComprehensionConfiguration; try { configuration = validateReadingComprehensionConfiguration(value); } catch (caught) { throw readingComprehensionItemInvalid(caught); } try { await validateReadingComprehensionMedia(configuration, async (mediaKey) => { assertSafeStorageKey(mediaKey); if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found"); }); } catch (caught) { throw readingComprehensionItemInvalid(caught); } return configuration; }
async function validateVoiceRecordingItemConfiguration(value: unknown): Promise<VoiceRecordingConfiguration> { let configuration: VoiceRecordingConfiguration; try { configuration = validateVoiceRecordingConfiguration(value); } catch (caught) { throw voiceRecordingItemInvalid(caught); } try { await validateVoiceRecordingMedia(configuration, async (mediaKey) => { assertSafeStorageKey(mediaKey); if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found"); }); } catch (caught) { throw voiceRecordingItemInvalid(caught); } return configuration; }

function validateInstance(schema: unknown, configuration: unknown): void { const definition = asRecord(schema); const data = asRecord(configuration); if (!definition || !data) throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Konfigurasi aktiviti mestilah objek yang selamat."); const properties = asRecord(definition.properties) ?? {}; const required = Array.isArray(definition.required) ? definition.required : []; for (const key of Object.keys(data)) if (!(key in properties)) throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Medan konfigurasi tidak disokong oleh templat."); for (const key of required) if (typeof key === "string" && data[key] === undefined) throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Medan konfigurasi wajib tiada."); for (const [key, value] of Object.entries(data)) { const rule = asRecord(properties[key]); if (!rule) continue; if (rule.type === "boolean" && typeof value !== "boolean") throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Jenis konfigurasi tidak sah."); if (rule.type === "string" && typeof value !== "string") throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Jenis konfigurasi tidak sah."); if (rule.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Jenis konfigurasi tidak sah."); if (Array.isArray(rule.enum) && !rule.enum.includes(value as never)) throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Nilai konfigurasi tidak dibenarkan."); if (typeof value === "number" && typeof rule.minimum === "number" && value < rule.minimum) throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Nilai konfigurasi terlalu kecil."); if (typeof value === "number" && typeof rule.maximum === "number" && value > rule.maximum) throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Nilai konfigurasi terlalu besar."); } }
function validateReward(value: unknown | null | undefined): Prisma.InputJsonValue | Prisma.JsonNullValueInput | undefined { if (value === undefined) return undefined; if (value === null) return Prisma.JsonNull; const data = asRecord(value); if (!data || jsonByteSize(value) > 16 * 1024 || Object.keys(data).some((key) => !["stars", "correctSound", "completionMessage", "mascotAnimation", "showConfetti"].includes(key)) || (data.mascotAnimation !== undefined && !["CHEER", "CLAP", "JUMP", "WAVE", "NONE"].includes(String(data.mascotAnimation)))) throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Konfigurasi ganjaran tidak sah."); return nullableSafeJson(value, "DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 16 * 1024); }
function validatePresentation(value: unknown | null | undefined): Prisma.InputJsonValue | Prisma.JsonNullValueInput | undefined { if (value === undefined) return undefined; if (value === null) return Prisma.JsonNull; const data = asRecord(value); if (!data || jsonByteSize(value) > 16 * 1024 || Object.keys(data).some((key) => !["theme", "fontScale", "showProgressBar", "showQuestionNumber", "backgroundMusicEnabled"].includes(key)) || (data.theme !== undefined && !["DEFAULT", "FOREST", "OCEAN", "SPACE", "FARM", "JUNGLE"].includes(String(data.theme))) || (data.fontScale !== undefined && !["NORMAL", "LARGE", "EXTRA_LARGE"].includes(String(data.fontScale)))) throw error("DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 400, "Tetapan persembahan tidak sah."); return nullableSafeJson(value, "DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 16 * 1024); }
function scoring(record: Pick<ActivityRecord, "scoringMode" | "reviewMode" | "totalMarks" | "masteryThreshold" | "attemptsAllowed" | "timeLimitSeconds" | "activityTemplate" | "items">): void { if (record.scoringMode === ActivityScoringMode.NONE && record.totalMarks !== null) throw error("DIGITAL_ACTIVITY_REVIEW_INVALID", 400, "Jumlah markah tidak dibenarkan untuk mode NONE."); if (record.scoringMode !== ActivityScoringMode.NONE && (!record.totalMarks || record.totalMarks < 1)) throw error("DIGITAL_ACTIVITY_REVIEW_INVALID", 400, "Jumlah markah diperlukan."); if (record.scoringMode === ActivityScoringMode.MASTERY_THRESHOLD && (!record.masteryThreshold || record.masteryThreshold < 1 || record.masteryThreshold > 100)) throw error("DIGITAL_ACTIVITY_REVIEW_INVALID", 400, "Ambang penguasaan diperlukan."); if (record.items.some((item) => record.scoringMode !== ActivityScoringMode.NONE && (!item.marks || item.marks < 1))) throw error("DIGITAL_ACTIVITY_REVIEW_INVALID", 400, "Markah item diperlukan."); if (record.scoringMode !== ActivityScoringMode.NONE && record.totalMarks !== (record.items.reduce((sum, item) => sum + (item.marks ?? 0), 0))) throw error("DIGITAL_ACTIVITY_REVIEW_INVALID", 400, "Jumlah markah mesti sepadan dengan markah item."); const code = record.activityTemplate.code; if (code === "VOICE_RECORDING" && record.reviewMode !== ActivityReviewMode.TEACHER && record.reviewMode !== ActivityReviewMode.AI_ASSISTED) throw error("DIGITAL_ACTIVITY_REVIEW_INVALID", 400, "Templat ini memerlukan semakan guru."); if ((code === "TRACING" || code === "COPY_WRITING") && record.reviewMode !== ActivityReviewMode.HYBRID && record.reviewMode !== ActivityReviewMode.TEACHER) throw error("DIGITAL_ACTIVITY_REVIEW_INVALID", 400, code === "TRACING" ? "Tracing memerlukan semakan HYBRID atau TEACHER." : "Copy Writing memerlukan semakan HYBRID atau TEACHER."); }

async function nextCode(programmeCode: string, templateCode: string): Promise<string> { const base = `AKT-${programmeCode}-${templateCode}`.replace(/[^A-Za-z0-9-]/g, "").slice(0, 90); const count = await prisma.digitalActivity.count({ where: { code: { startsWith: base } } }); return `${base}-${String(count + 1).padStart(4, "0")}`; }
async function programmeAndTemplate(programmeId: string, templateId: string) { const [programme, template] = await Promise.all([prisma.curriculumProgramme.findUnique({ where: { id: programmeId }, include: { curriculumVersion: true } }), prisma.activityTemplate.findUnique({ where: { id: templateId }, include: { acceptedItemTypes: true } })]); if (!programme || programme.curriculumVersion.status !== CurriculumStatus.PUBLISHED) throw error("DIGITAL_ACTIVITY_CURRICULUM_LINK_INVALID", 400, "Program mesti menggunakan versi kurikulum PUBLISHED."); if (!template || template.status !== ActivityTemplateStatus.ACTIVE) throw error("DIGITAL_ACTIVITY_TEMPLATE_INVALID", 400, "Templat aktiviti mesti ACTIVE."); return { programme, template }; }
export async function createDigitalActivity(input: CreateDigitalActivityBody, context: DigitalActivityAuditContext) { manage(context); const { programme, template } = await programmeAndTemplate(input.programmeId, input.activityTemplateId); validateInstance(template.configurationSchema, input.configuration); const code = input.code ?? await nextCode(programme.code, template.code); try { const record = await prisma.digitalActivity.create({ data: { code, title: input.title, description: input.description ?? null, instructions: input.instructions, learningOutcome: input.learningOutcome ?? null, programmeId: input.programmeId, activityTemplateId: input.activityTemplateId, createdByUserId: context.actor.userId, difficulty: input.difficulty, scoringMode: input.scoringMode, reviewMode: input.reviewMode, totalMarks: input.totalMarks ?? null, masteryThreshold: input.masteryThreshold ?? null, estimatedMinutes: input.estimatedMinutes ?? null, attemptsAllowed: input.attemptsAllowed ?? null, timeLimitSeconds: input.timeLimitSeconds ?? null, shuffleItems: input.shuffleItems, showImmediateFeedback: input.showImmediateFeedback, allowRetry: input.allowRetry, configuration: safeJson(input.configuration, "DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 64 * 1024), rewardConfiguration: validateReward(input.rewardConfiguration), presentationSettings: validatePresentation(input.presentationSettings) }, include }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_CREATED", record.id, null, safeAudit(record))); return dto(record); } catch (caught) { if (unique(caught)) throw error("DIGITAL_ACTIVITY_CODE_EXISTS", 409, "Kod aktiviti digital telah digunakan."); throw caught; } }
export async function getDigitalActivity(activityId: string, context: DigitalActivityAuditContext) { const record = await get(activityId); visible(record, context); return dto(record); }
export async function updateDigitalActivity(activityId: string, input: UpdateDigitalActivityBody, context: DigitalActivityAuditContext) { manage(context); const existing = await get(activityId); draft(existing); if (context.actor.role === UserRole.ADMIN && existing.createdByUserId !== context.actor.userId) throw denied(); const template = existing.activityTemplate; const configuration = input.configuration ?? existing.configuration; validateInstance(template.configurationSchema, configuration); const updated = await prisma.digitalActivity.update({ where: { id: activityId }, data: { ...(input.title !== undefined ? { title: input.title } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.instructions !== undefined ? { instructions: input.instructions } : {}), ...(input.learningOutcome !== undefined ? { learningOutcome: input.learningOutcome } : {}), ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}), ...(input.scoringMode !== undefined ? { scoringMode: input.scoringMode } : {}), ...(input.reviewMode !== undefined ? { reviewMode: input.reviewMode } : {}), ...(input.totalMarks !== undefined ? { totalMarks: input.totalMarks } : {}), ...(input.masteryThreshold !== undefined ? { masteryThreshold: input.masteryThreshold } : {}), ...(input.estimatedMinutes !== undefined ? { estimatedMinutes: input.estimatedMinutes } : {}), ...(input.attemptsAllowed !== undefined ? { attemptsAllowed: input.attemptsAllowed } : {}), ...(input.timeLimitSeconds !== undefined ? { timeLimitSeconds: input.timeLimitSeconds } : {}), ...(input.shuffleItems !== undefined ? { shuffleItems: input.shuffleItems } : {}), ...(input.showImmediateFeedback !== undefined ? { showImmediateFeedback: input.showImmediateFeedback } : {}), ...(input.allowRetry !== undefined ? { allowRetry: input.allowRetry } : {}), ...(input.configuration !== undefined ? { configuration: safeJson(input.configuration, "DIGITAL_ACTIVITY_CONFIGURATION_INVALID", 64 * 1024) } : {}), ...(input.rewardConfiguration !== undefined ? { rewardConfiguration: validateReward(input.rewardConfiguration) } : {}), ...(input.presentationSettings !== undefined ? { presentationSettings: validatePresentation(input.presentationSettings) } : {}), updatedByUserId: context.actor.userId }, include }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_UPDATED", activityId, safeAudit(existing), safeAudit(updated))); return dto(updated); }

async function validateLink(programmeId: string, input: CreateDigitalActivityCurriculumLinkBody): Promise<void> { const [year, structure, skill, content, learning, objective] = await Promise.all([input.curriculumYearId ? prisma.curriculumYear.findUnique({ where: { id: input.curriculumYearId }, select: { programmeId: true } }) : null, input.languageStructureId ? prisma.languageStructure.findUnique({ where: { id: input.languageStructureId }, select: { programmeId: true } }) : null, input.remedialSkillId ? prisma.remedialSkill.findUnique({ where: { id: input.remedialSkillId }, select: { programmeId: true, languageStructureId: true } }) : null, input.contentStandardId ? prisma.contentStandard.findUnique({ where: { id: input.contentStandardId }, select: { programmeId: true, curriculumYearId: true } }) : null, input.learningStandardId ? prisma.learningStandard.findUnique({ where: { id: input.learningStandardId }, select: { contentStandard: { select: { programmeId: true, curriculumYearId: true, id: true } } } }) : null, input.learningObjectiveId ? prisma.learningObjective.findUnique({ where: { id: input.learningObjectiveId }, select: { remedialSkill: { select: { programmeId: true, id: true } } } }) : null]); const programmeIds = [year?.programmeId, structure?.programmeId, skill?.programmeId, content?.programmeId, learning?.contentStandard.programmeId, objective?.remedialSkill.programmeId].filter((id): id is string => Boolean(id)); if (programmeIds.length === 0 || programmeIds.some((id) => id !== programmeId)) throw error("DIGITAL_ACTIVITY_CROSS_VERSION_LINK", 400, "Pautan kurikulum mesti daripada program dan versi yang sama."); if (input.learningStandardId && input.contentStandardId && learning?.contentStandard.id !== input.contentStandardId) throw error("DIGITAL_ACTIVITY_CURRICULUM_LINK_INVALID", 400, "SP mesti sepadan dengan SK."); if (input.curriculumYearId && (content?.curriculumYearId ?? learning?.contentStandard.curriculumYearId) && input.curriculumYearId !== (content?.curriculumYearId ?? learning?.contentStandard.curriculumYearId)) throw error("DIGITAL_ACTIVITY_CURRICULUM_LINK_INVALID", 400, "SK/SP mesti sepadan dengan tahun."); if (input.remedialSkillId && input.languageStructureId && skill?.languageStructureId !== input.languageStructureId) throw error("DIGITAL_ACTIVITY_CURRICULUM_LINK_INVALID", 400, "KP mesti sepadan dengan struktur bahasa."); }
export async function addDigitalActivityCurriculumLink(activityId: string, input: CreateDigitalActivityCurriculumLinkBody, context: DigitalActivityAuditContext) { manage(context); const record = await get(activityId); draft(record); await validateLink(record.programmeId, input); try { const link = await prisma.$transaction(async (tx) => { const duplicate = await tx.digitalActivityCurriculumLink.findFirst({ where: { digitalActivityId: activityId, curriculumYearId: input.curriculumYearId ?? null, languageStructureId: input.languageStructureId ?? null, remedialSkillId: input.remedialSkillId ?? null, contentStandardId: input.contentStandardId ?? null, learningStandardId: input.learningStandardId ?? null, learningObjectiveId: input.learningObjectiveId ?? null } }); if (duplicate) throw error("DIGITAL_ACTIVITY_CURRICULUM_LINK_EXISTS", 409, "Pautan kurikulum telah wujud."); if (input.isPrimary) await tx.digitalActivityCurriculumLink.updateMany({ where: { digitalActivityId: activityId, isPrimary: true }, data: { isPrimary: false } }); const created = await tx.digitalActivityCurriculumLink.create({ data: { digitalActivityId: activityId, ...input } }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_CURRICULUM_LINKED", created.id, null, { activityId, isPrimary: created.isPrimary }), { transactionClient: tx }); return created; }); return link; } catch (caught) { if (unique(caught)) throw error("DIGITAL_ACTIVITY_CURRICULUM_LINK_EXISTS", 409, "Pautan kurikulum telah wujud."); throw caught; } }
export async function listDigitalActivityCurriculumLinks(activityId: string, context: DigitalActivityAuditContext) { const record = await get(activityId); visible(record, context); return dto(record).curriculumLinks; }
export async function removeDigitalActivityCurriculumLink(activityId: string, linkId: string, context: DigitalActivityAuditContext) { manage(context); const record = await get(activityId); draft(record); const link = await prisma.digitalActivityCurriculumLink.findFirst({ where: { id: linkId, digitalActivityId: activityId } }); if (!link) throw error("DIGITAL_ACTIVITY_CURRICULUM_LINK_INVALID", 404, "Pautan kurikulum tidak ditemui."); await prisma.digitalActivityCurriculumLink.delete({ where: { id: linkId } }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_CURRICULUM_UNLINKED", linkId, { activityId }, null)); }

async function validateItem(record: ActivityRecord, input: AddDigitalActivityItemBody): Promise<ValidatedActivityItemContract> {
  const item = await prisma.questionBankItem.findUnique({ where: { id: input.questionBankItemId }, select: { id: true, status: true, type: true, programmeId: true } });
  if (!item || item.status !== QuestionBankStatus.ACTIVE) throw error("DIGITAL_ACTIVITY_ITEM_INVALID", 400, "Item bank soalan mesti ACTIVE.");
  if (item.programmeId !== record.programmeId) throw error("DIGITAL_ACTIVITY_CROSS_VERSION_LINK", 400, "Item bank soalan mesti daripada program yang sama.");
  if (!record.activityTemplate.acceptedItemTypes.some((type) => type.itemType === item.type)) throw error("DIGITAL_ACTIVITY_ITEM_TYPE_UNSUPPORTED", 400, "Jenis item tidak disokong oleh templat.");
  if (record.activityTemplate.rendererKey === "fill-blank") {
    return { fillBlank: await validateFillBlankItemConfiguration(input.configuration), arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null };
  }
  if (record.activityTemplate.rendererKey === "arrange-letters") return { fillBlank: null, arrangeLetters: validateArrangeLettersItemConfiguration(input.configuration), arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null };
  if (record.activityTemplate.rendererKey === "arrange-syllables") return { fillBlank: null, arrangeLetters: null, arrangeSyllables: validateArrangeSyllablesItemConfiguration(input.configuration), wordBuilder: null, tracing: null, copyWriting: null, reading: null };
  if (record.activityTemplate.rendererKey === "word-builder") return { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: await validateWordBuilderItemConfiguration(input.configuration), tracing: null, copyWriting: null, reading: null };
  if (record.activityTemplate.rendererKey === "tracing") return { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: validateTracingItemConfiguration(input.configuration), copyWriting: null, reading: null };
  if (record.activityTemplate.rendererKey === "copy-writing") return { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: await validateCopyWritingItemConfiguration(input.configuration), reading: null };
  if (record.activityTemplate.code === "READING_COMPREHENSION") return { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null, readingComprehension: await validateReadingComprehensionItemConfiguration(input.configuration) };
  if (record.activityTemplate.rendererKey === "voice-recording") return { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null, voiceRecording: await validateVoiceRecordingItemConfiguration(input.configuration) };
  if (record.activityTemplate.rendererKey === "reading") return { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: await validateReadingItemConfiguration(input.configuration) };
  if (record.activityTemplate.rendererKey === "free-handwriting") return { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null, freeHandwriting: await validateFreeHandwritingItemConfiguration(input.configuration) };
  if (input.configuration !== undefined && input.configuration !== null) safeJson(input.configuration, "DIGITAL_ACTIVITY_ITEM_INVALID", 16 * 1024);
  return { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null };
}

export async function addDigitalActivityItem(activityId: string, input: AddDigitalActivityItemBody, context: DigitalActivityAuditContext) {
  manage(context);
  const record = await get(activityId);
  draft(record);
  const contract = await validateItem(record, input);
  try {
    const item = await prisma.digitalActivityItem.create({
      data: {
        digitalActivityId: activityId,
        questionBankItemId: input.questionBankItemId,
        sequence: input.sequence,
        sectionKey: input.sectionKey ?? null,
        isRequired: input.isRequired,
        marks: input.marks ?? null,
        ...(input.configuration !== undefined ? { configuration: input.configuration === null ? Prisma.JsonNull : safeJson(input.configuration, "DIGITAL_ACTIVITY_ITEM_INVALID", 16 * 1024) } : {}),
      },
    });
    await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_ITEM_ADDED", item.id, null, { activityId, sequence: item.sequence, marks: item.marks, ...itemContractAudit(contract) }));
    return item;
  } catch (caught) {
    if (unique(caught)) throw error("DIGITAL_ACTIVITY_ITEM_EXISTS", 409, "Item atau turutan aktiviti telah digunakan.");
    throw caught;
  }
}
export async function listDigitalActivityItems(activityId: string, context: DigitalActivityAuditContext) { const record = await get(activityId); visible(record, context); return dto(record).items; }
export async function updateDigitalActivityItem(activityId: string, activityItemId: string, input: UpdateDigitalActivityItemBody, context: DigitalActivityAuditContext) {
  manage(context);
  const record = await get(activityId);
  draft(record);
  const current = await prisma.digitalActivityItem.findFirst({ where: { id: activityItemId, digitalActivityId: activityId } });
  if (!current) throw error("DIGITAL_ACTIVITY_ITEM_NOT_FOUND", 404, "Item aktiviti tidak ditemui.");
  const effectiveConfiguration = input.configuration === undefined ? current.configuration : input.configuration;
  const contract: ValidatedActivityItemContract = record.activityTemplate.rendererKey === "fill-blank"
    ? { fillBlank: await validateFillBlankItemConfiguration(effectiveConfiguration), arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null }
    : record.activityTemplate.rendererKey === "arrange-letters"
      ? { fillBlank: null, arrangeLetters: validateArrangeLettersItemConfiguration(effectiveConfiguration), arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null }
      : record.activityTemplate.rendererKey === "arrange-syllables"
        ? { fillBlank: null, arrangeLetters: null, arrangeSyllables: validateArrangeSyllablesItemConfiguration(effectiveConfiguration), wordBuilder: null, tracing: null, copyWriting: null, reading: null }
        : record.activityTemplate.rendererKey === "word-builder"
          ? { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: await validateWordBuilderItemConfiguration(effectiveConfiguration), tracing: null, copyWriting: null, reading: null }
          : record.activityTemplate.rendererKey === "tracing"
            ? { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: validateTracingItemConfiguration(effectiveConfiguration), copyWriting: null, reading: null }
            : record.activityTemplate.rendererKey === "copy-writing"
              ? { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: await validateCopyWritingItemConfiguration(effectiveConfiguration), reading: null }
              : record.activityTemplate.code === "READING_COMPREHENSION"
                ? { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null, readingComprehension: await validateReadingComprehensionItemConfiguration(effectiveConfiguration) }
                : record.activityTemplate.rendererKey === "voice-recording"
                  ? { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null, voiceRecording: await validateVoiceRecordingItemConfiguration(effectiveConfiguration) }
                : record.activityTemplate.rendererKey === "reading"
                  ? { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: await validateReadingItemConfiguration(effectiveConfiguration) }
                  : record.activityTemplate.rendererKey === "free-handwriting"
                    ? { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null, freeHandwriting: await validateFreeHandwritingItemConfiguration(effectiveConfiguration) }
                    : { fillBlank: null, arrangeLetters: null, arrangeSyllables: null, wordBuilder: null, tracing: null, copyWriting: null, reading: null };
  if (record.activityTemplate.rendererKey !== "fill-blank" && record.activityTemplate.rendererKey !== "arrange-letters" && record.activityTemplate.rendererKey !== "arrange-syllables" && record.activityTemplate.rendererKey !== "word-builder" && record.activityTemplate.rendererKey !== "tracing" && record.activityTemplate.rendererKey !== "copy-writing" && record.activityTemplate.rendererKey !== "reading" && record.activityTemplate.rendererKey !== "free-handwriting" && record.activityTemplate.rendererKey !== "voice-recording" && input.configuration !== undefined && input.configuration !== null) safeJson(input.configuration, "DIGITAL_ACTIVITY_ITEM_INVALID", 16 * 1024);
  const item = await prisma.digitalActivityItem.update({ where: { id: activityItemId }, data: { ...(input.sectionKey !== undefined ? { sectionKey: input.sectionKey } : {}), ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}), ...(input.marks !== undefined ? { marks: input.marks } : {}), ...(input.configuration !== undefined ? { configuration: input.configuration === null ? Prisma.JsonNull : safeJson(input.configuration, "DIGITAL_ACTIVITY_ITEM_INVALID", 16 * 1024) } : {}) } });
  await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_ITEM_UPDATED", item.id, { activityId, sequence: current.sequence }, { activityId, sequence: item.sequence, ...itemContractAudit(contract) }));
  return item;
}
export async function removeDigitalActivityItem(activityId: string, activityItemId: string, context: DigitalActivityAuditContext) { manage(context); const record = await get(activityId); draft(record); const item = await prisma.digitalActivityItem.findFirst({ where: { id: activityItemId, digitalActivityId: activityId } }); if (!item) throw error("DIGITAL_ACTIVITY_ITEM_NOT_FOUND", 404, "Item aktiviti tidak ditemui."); await prisma.digitalActivityItem.delete({ where: { id: activityItemId } }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_ITEM_REMOVED", activityItemId, { activityId, sequence: item.sequence }, null)); }
export async function reorderDigitalActivityItems(activityId: string, ids: string[], context: DigitalActivityAuditContext) { manage(context); const record = await get(activityId); draft(record); await prisma.$transaction(async (tx) => { const items = await tx.digitalActivityItem.findMany({ where: { digitalActivityId: activityId }, select: { id: true } }); if (items.length !== ids.length || items.some((item) => !ids.includes(item.id))) throw error("DIGITAL_ACTIVITY_ITEM_ORDER_INVALID", 400, "Susunan mesti mengandungi semua item aktiviti."); const offset = 200_000; await Promise.all(items.map((item, index) => tx.digitalActivityItem.update({ where: { id: item.id }, data: { sequence: offset + index } }))); await Promise.all(ids.map((id, index) => tx.digitalActivityItem.update({ where: { id }, data: { sequence: index } }))); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_ITEMS_REORDERED", activityId, null, { itemCount: ids.length }), { transactionClient: tx }); }); }

function mediaExtension(key: string): string { return key.split(".").pop()?.toLowerCase() ?? ""; }
async function validateMedia(input: AddDigitalActivityMediaBody): Promise<void> { try { assertSafeStorageKey(input.mediaKey); if (!(await getStorageAdapter().exists(input.mediaKey))) throw new Error(); const extension = mediaExtension(input.mediaKey); if (imageRoles.has(input.mediaRole) && (!supportedExtensions.image.has(extension) || !input.mediaKey.startsWith("activity-image/"))) throw new Error(); if (audioRoles.has(input.mediaRole) && (!supportedExtensions.audio.has(extension) || !input.mediaKey.startsWith("activity-audio/"))) throw new Error(); if (videoRoles.has(input.mediaRole) && (!supportedExtensions.video.has(extension) || !input.mediaKey.startsWith("activity-video/"))) throw new Error(); if (input.mimeType && ((imageRoles.has(input.mediaRole) && !input.mimeType.startsWith("image/")) || (audioRoles.has(input.mediaRole) && !input.mimeType.startsWith("audio/")) || (videoRoles.has(input.mediaRole) && !input.mimeType.startsWith("video/")))) throw new Error(); } catch { throw error("DIGITAL_ACTIVITY_MEDIA_INVALID", 400, "Pautan media tidak sah."); } }
export async function addDigitalActivityMedia(activityId: string, input: AddDigitalActivityMediaBody, context: DigitalActivityAuditContext) { manage(context); const record = await get(activityId); draft(record); await validateMedia(input); try { const media = await prisma.$transaction(async (tx) => { if (input.isPrimary) await tx.digitalActivityMedia.updateMany({ where: { digitalActivityId: activityId, mediaRole: input.mediaRole, isPrimary: true }, data: { isPrimary: false } }); return tx.digitalActivityMedia.create({ data: { digitalActivityId: activityId, ...input, mimeType: input.mimeType ?? null, label: input.label ?? null, altText: input.altText ?? null } }); }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_MEDIA_LINKED", media.id, null, { activityId, mediaRole: media.mediaRole, sequence: media.sequence })); return { ...media, url: getStorageAdapter().getPublicUrl(media.mediaKey) }; } catch (caught) { if (unique(caught)) throw error("DIGITAL_ACTIVITY_MEDIA_INVALID", 409, "Media atau turutan media telah digunakan."); throw caught; } }
export async function listDigitalActivityMedia(activityId: string, context: DigitalActivityAuditContext) { const record = await get(activityId); visible(record, context); return dto(record).media; }
export async function removeDigitalActivityMedia(activityId: string, mediaLinkId: string, context: DigitalActivityAuditContext) { manage(context); const record = await get(activityId); draft(record); const media = await prisma.digitalActivityMedia.findFirst({ where: { id: mediaLinkId, digitalActivityId: activityId } }); if (!media) throw error("DIGITAL_ACTIVITY_MEDIA_NOT_FOUND", 404, "Pautan media tidak ditemui."); await prisma.digitalActivityMedia.delete({ where: { id: mediaLinkId } }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_MEDIA_UNLINKED", mediaLinkId, { activityId, mediaRole: media.mediaRole }, null)); }
export async function reorderDigitalActivityMedia(activityId: string, ids: string[], context: DigitalActivityAuditContext) { manage(context); const record = await get(activityId); draft(record); await prisma.$transaction(async (tx) => { const media = await tx.digitalActivityMedia.findMany({ where: { digitalActivityId: activityId }, select: { id: true, mediaRole: true } }); if (media.length !== ids.length || media.some((item) => !ids.includes(item.id))) throw error("DIGITAL_ACTIVITY_MEDIA_INVALID", 400, "Susunan mesti mengandungi semua media."); await Promise.all(media.map((item, index) => tx.digitalActivityMedia.update({ where: { id: item.id }, data: { sequence: 200_000 + index } }))); const positions = new Map<string, number>(); await Promise.all(ids.map(async (id) => { const item = media.find((entry) => entry.id === id); if (!item) throw error("DIGITAL_ACTIVITY_MEDIA_INVALID", 400, "Media tidak sah."); const sequence = positions.get(item.mediaRole) ?? 1; positions.set(item.mediaRole, sequence + 1); await tx.digitalActivityMedia.update({ where: { id }, data: { sequence } }); })); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_MEDIA_REORDERED", activityId, null, { mediaCount: ids.length }), { transactionClient: tx }); }); }

async function fillBlankWorkflowIssues(configuration: unknown): Promise<readonly string[]> {
  try {
    const contract = validateFillBlankConfiguration(configuration);
    await validateFillBlankMedia(contract, async (mediaKey) => {
      assertSafeStorageKey(mediaKey);
      if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found");
    });
    return [];
  } catch (caught) {
    return fillBlankIssues(caught);
  }
}

function arrangeLettersWorkflowIssues(configuration: unknown): readonly string[] {
  try {
    validateArrangeLettersConfiguration(configuration);
    return [];
  } catch (caught) {
    return arrangeLettersIssues(caught);
  }
}

function arrangeSyllablesWorkflowIssues(configuration: unknown): readonly string[] {
  try {
    validateArrangeSyllablesConfiguration(configuration);
    return [];
  } catch (caught) {
    return arrangeSyllablesIssues(caught);
  }
}

async function wordBuilderWorkflowIssues(configuration: unknown): Promise<readonly string[]> {
  try {
    const contract = validateWordBuilderConfiguration(configuration);
    await validateWordBuilderMedia(contract, async (mediaKey) => {
      assertSafeStorageKey(mediaKey);
      if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found");
    });
    return [];
  } catch (caught) {
    return wordBuilderIssues(caught);
  }
}

function tracingWorkflowIssues(configuration: unknown): readonly string[] {
  try {
    validateTracingConfiguration(configuration);
    return [];
  } catch (caught) {
    return tracingIssues(caught);
  }
}

async function copyWritingWorkflowIssues(configuration: unknown): Promise<readonly string[]> {
  try {
    const contract = validateCopyWritingConfiguration(configuration);
    await validateCopyWritingMedia(contract, async (mediaKey) => {
      assertSafeStorageKey(mediaKey);
      if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found");
    });
    return [];
  } catch (caught) {
    return copyWritingIssues(caught);
  }
}

async function readingWorkflowIssues(configuration: unknown): Promise<readonly string[]> {
  try {
    const contract = validateReadingConfiguration(configuration);
    await validateReadingMedia(contract, async (mediaKey) => {
      assertSafeStorageKey(mediaKey);
      if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found");
    });
    return [];
  } catch (caught) {
    return readingIssues(caught);
  }
}
async function freeHandwritingWorkflowIssues(configuration: unknown): Promise<readonly string[]> { try { const contract = validateFreeHandwritingConfiguration(configuration); await validateFreeHandwritingMedia(contract, async (mediaKey) => { assertSafeStorageKey(mediaKey); if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found"); }); return []; } catch (caught) { return freeHandwritingIssues(caught); } }
async function readingComprehensionWorkflowIssues(configuration: unknown): Promise<readonly string[]> { try { const contract = validateReadingComprehensionConfiguration(configuration); await validateReadingComprehensionMedia(contract, async (mediaKey) => { assertSafeStorageKey(mediaKey); if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found"); }); return []; } catch (caught) { return readingComprehensionIssues(caught); } }
async function voiceRecordingWorkflowIssues(configuration: unknown): Promise<readonly string[]> { try { const contract = validateVoiceRecordingConfiguration(configuration); await validateVoiceRecordingMedia(contract, async (mediaKey) => { assertSafeStorageKey(mediaKey); if (!(await getStorageAdapter().exists(mediaKey))) throw new Error("Media not found"); }); return []; } catch (caught) { return voiceRecordingIssues(caught); } }

async function reviewValidation(record: ActivityRecord, publication: boolean): Promise<void> {
  const issues: string[] = [];
  if (!record.title.trim() || !record.instructions.trim()) issues.push("CONTENT_REQUIRED");
  if (record.programme.curriculumVersion.status !== CurriculumStatus.PUBLISHED) issues.push("CURRICULUM_NOT_PUBLISHED");
  if (record.activityTemplate.status !== ActivityTemplateStatus.ACTIVE) issues.push("TEMPLATE_INACTIVE");
  try { validateInstance(record.activityTemplate.configurationSchema, record.configuration); validateReward(record.rewardConfiguration); validatePresentation(record.presentationSettings); } catch { issues.push("CONFIGURATION_INVALID"); }
  if (record.curriculumLinks.length === 0) issues.push("CURRICULUM_LINK_REQUIRED");
  if (record.curriculumLinks.filter((link) => link.isPrimary).length !== 1) issues.push("PRIMARY_LINK_REQUIRED");
  if (record.items.length === 0) issues.push("ITEM_REQUIRED");
  const sequences = record.items.map((item) => item.sequence).sort((left, right) => left - right);
  if (sequences.some((value, index) => value !== index)) issues.push("ITEM_ORDER_INVALID");
  for (const item of record.items) {
    if (item.questionBankItem.status !== QuestionBankStatus.ACTIVE || item.questionBankItem.programmeId !== record.programmeId || !record.activityTemplate.acceptedItemTypes.some((type) => type.itemType === item.questionBankItem.type)) {
      issues.push("ITEM_INVALID");
      break;
    }
  }
  if (record.activityTemplate.rendererKey === "fill-blank") {
    for (const item of record.items) {
      const fillBlankIssuesForItem = await fillBlankWorkflowIssues(item.configuration);
      if (fillBlankIssuesForItem.length > 0) {
        issues.push("FILL_BLANK_CONTRACT_INVALID", ...fillBlankIssuesForItem);
        break;
      }
    }
  }
  if (record.activityTemplate.rendererKey === "arrange-letters") {
    for (const item of record.items) {
      const arrangeLettersIssuesForItem = arrangeLettersWorkflowIssues(item.configuration);
      if (arrangeLettersIssuesForItem.length > 0) {
        issues.push("ARRANGE_LETTERS_CONTRACT_INVALID", ...arrangeLettersIssuesForItem);
        break;
      }
    }
  }
  if (record.activityTemplate.rendererKey === "arrange-syllables") {
    for (const item of record.items) {
      const arrangeSyllablesIssuesForItem = arrangeSyllablesWorkflowIssues(item.configuration);
      if (arrangeSyllablesIssuesForItem.length > 0) {
        issues.push("ARRANGE_SYLLABLES_CONTRACT_INVALID", ...arrangeSyllablesIssuesForItem);
        break;
      }
    }
  }
  if (record.activityTemplate.rendererKey === "word-builder") {
    for (const item of record.items) {
      const wordBuilderIssuesForItem = await wordBuilderWorkflowIssues(item.configuration);
      if (wordBuilderIssuesForItem.length > 0) {
        issues.push("WORD_BUILDER_CONTRACT_INVALID", ...wordBuilderIssuesForItem);
        break;
      }
    }
  }
  if (record.activityTemplate.rendererKey === "tracing") {
    for (const item of record.items) {
      const tracingIssuesForItem = tracingWorkflowIssues(item.configuration);
      if (tracingIssuesForItem.length > 0) {
        issues.push("TRACING_CONTRACT_INVALID", ...tracingIssuesForItem);
        break;
      }
    }
  }
  if (record.activityTemplate.rendererKey === "copy-writing") {
    for (const item of record.items) {
      const copyWritingIssuesForItem = await copyWritingWorkflowIssues(item.configuration);
      if (copyWritingIssuesForItem.length > 0) {
        issues.push("COPY_WRITING_CONTRACT_INVALID", ...copyWritingIssuesForItem);
        break;
      }
    }
  }
  if (record.activityTemplate.rendererKey === "reading") {
    for (const item of record.items) {
      const readingIssuesForItem = await readingWorkflowIssues(item.configuration);
      if (readingIssuesForItem.length > 0) {
        issues.push("READING_CONTRACT_INVALID", ...readingIssuesForItem);
        break;
      }
    }
  }
  if (record.activityTemplate.rendererKey === "free-handwriting") {
    for (const item of record.items) {
      const freeHandwritingIssuesForItem = await freeHandwritingWorkflowIssues(item.configuration);
      if (freeHandwritingIssuesForItem.length > 0) { issues.push("FREE_HANDWRITING_CONTRACT_INVALID", ...freeHandwritingIssuesForItem); break; }
    }
  }
  if (record.activityTemplate.code === "READING_COMPREHENSION") {
    for (const item of record.items) { const itemIssues = await readingComprehensionWorkflowIssues(item.configuration); if (itemIssues.length > 0) { issues.push("READING_COMPREHENSION_CONTRACT_INVALID", ...itemIssues); break; } }
  }
  if (record.activityTemplate.rendererKey === "voice-recording") { for (const item of record.items) { const itemIssues = await voiceRecordingWorkflowIssues(item.configuration); if (itemIssues.length > 0) { issues.push("VOICE_RECORDING_CONTRACT_INVALID", ...itemIssues); break; } } }
  try { scoring(record); } catch { issues.push("SCORING_INVALID"); }
  for (const media of record.mediaLinks) {
    try { await validateMedia({ mediaKey: media.mediaKey, mediaRole: media.mediaRole as AddDigitalActivityMediaBody["mediaRole"], mimeType: media.mimeType ?? undefined, label: media.label ?? undefined, altText: media.altText ?? undefined, sequence: media.sequence, isPrimary: media.isPrimary }); } catch { issues.push("MEDIA_INVALID"); break; }
  }
  if (publication && !record.reviewHistory.some((entry) => entry.toStatus === DigitalActivityStatus.IN_REVIEW)) issues.push("REVIEW_HISTORY_REQUIRED");
  if (issues.length) throw error(publication ? "DIGITAL_ACTIVITY_PUBLICATION_INVALID" : "DIGITAL_ACTIVITY_REVIEW_INVALID", 400, "Aktiviti belum memenuhi syarat workflow.", { issues: [...new Set(issues)] });
}
export async function submitDigitalActivityForReview(activityId: string, context: DigitalActivityAuditContext) { manage(context); const record = await get(activityId); draft(record); if (context.actor.role === UserRole.ADMIN && record.createdByUserId !== context.actor.userId) throw denied(); await reviewValidation(record, false); const updated = await prisma.$transaction(async (tx) => { const next = await tx.digitalActivity.update({ where: { id: activityId }, data: { status: DigitalActivityStatus.IN_REVIEW, submittedForReviewAt: new Date(), updatedByUserId: context.actor.userId }, include }); await tx.digitalActivityReviewHistory.create({ data: { digitalActivityId: activityId, actorUserId: context.actor.userId, fromStatus: DigitalActivityStatus.DRAFT, toStatus: DigitalActivityStatus.IN_REVIEW } }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_SUBMITTED_FOR_REVIEW", activityId, safeAudit(record), safeAudit(next)), { transactionClient: tx }); return next; }); return dto(updated); }
export async function returnDigitalActivityToDraft(activityId: string, comment: string, context: DigitalActivityAuditContext) { superAdmin(context); const record = await get(activityId); if (record.status !== DigitalActivityStatus.IN_REVIEW) throw transition(); const updated = await prisma.$transaction(async (tx) => { const next = await tx.digitalActivity.update({ where: { id: activityId }, data: { status: DigitalActivityStatus.DRAFT, updatedByUserId: context.actor.userId }, include }); await tx.digitalActivityReviewHistory.create({ data: { digitalActivityId: activityId, actorUserId: context.actor.userId, fromStatus: DigitalActivityStatus.IN_REVIEW, toStatus: DigitalActivityStatus.DRAFT, comment } }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_RETURNED_TO_DRAFT", activityId, safeAudit(record), safeAudit(next)), { transactionClient: tx }); return next; }); return dto(updated); }
export async function publishDigitalActivity(activityId: string, context: DigitalActivityAuditContext) { superAdmin(context); const record = await get(activityId); if (record.status !== DigitalActivityStatus.IN_REVIEW) throw transition(); await reviewValidation(record, true); const updated = await prisma.$transaction(async (tx) => { const next = await tx.digitalActivity.update({ where: { id: activityId }, data: { status: DigitalActivityStatus.PUBLISHED, publishedAt: new Date(), updatedByUserId: context.actor.userId }, include }); await tx.digitalActivityReviewHistory.create({ data: { digitalActivityId: activityId, actorUserId: context.actor.userId, fromStatus: DigitalActivityStatus.IN_REVIEW, toStatus: DigitalActivityStatus.PUBLISHED } }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_PUBLISHED", activityId, safeAudit(record), safeAudit(next)), { transactionClient: tx, strict: true }); return next; }); return dto(updated); }
export async function archiveDigitalActivity(activityId: string, context: DigitalActivityAuditContext) { superAdmin(context); const record = await get(activityId); if (record.status !== DigitalActivityStatus.PUBLISHED) throw transition(); const updated = await prisma.$transaction(async (tx) => { const next = await tx.digitalActivity.update({ where: { id: activityId }, data: { status: DigitalActivityStatus.ARCHIVED, archivedAt: new Date(), updatedByUserId: context.actor.userId }, include }); await tx.digitalActivityReviewHistory.create({ data: { digitalActivityId: activityId, actorUserId: context.actor.userId, fromStatus: DigitalActivityStatus.PUBLISHED, toStatus: DigitalActivityStatus.ARCHIVED } }); await recordAuditEvent(audit(context, "DIGITAL_ACTIVITY_ARCHIVED", activityId, safeAudit(record), safeAudit(next)), { transactionClient: tx, strict: true }); return next; }); return dto(updated); }

function where(query: ListDigitalActivitiesQuery, context: DigitalActivityAuditContext): Prisma.DigitalActivityWhereInput { const curriculum: Prisma.DigitalActivityCurriculumLinkWhereInput[] = []; if (query.remedialSkillId) curriculum.push({ remedialSkillId: query.remedialSkillId }); if (query.contentStandardId) curriculum.push({ contentStandardId: query.contentStandardId }); if (query.learningStandardId) curriculum.push({ learningStandardId: query.learningStandardId }); if (query.curriculumYearId) curriculum.push({ curriculumYearId: query.curriculumYearId }); const media: Prisma.DigitalActivityWhereInput[] = []; const addMedia = (flag: boolean | undefined, roles: string[]) => { if (flag !== undefined) media.push({ mediaLinks: flag ? { some: { mediaRole: { in: roles } } } : { none: { mediaRole: { in: roles } } } }); }; addMedia(query.hasImage, [...imageRoles]); addMedia(query.hasAudio, [...audioRoles]); addMedia(query.hasVideo, [...videoRoles]); const programme: Prisma.CurriculumProgrammeWhereInput = { ...(query.curriculumVersionId ? { curriculumVersionId: query.curriculumVersionId } : {}), ...(context.actor.role === UserRole.TEACHER ? { curriculumVersion: { status: CurriculumStatus.PUBLISHED } } : {}) }; const activityTemplate: Prisma.ActivityTemplateWhereInput = { ...(query.templateCode ? { code: query.templateCode.toUpperCase() } : {}), ...(query.templateCategory ? { category: query.templateCategory } : {}) }; return { ...(context.actor.role === UserRole.TEACHER ? { status: DigitalActivityStatus.PUBLISHED } : query.status ? { status: query.status } : {}), ...(query.difficulty ? { difficulty: query.difficulty } : {}), ...(query.programmeId ? { programmeId: query.programmeId } : {}), ...(Object.keys(programme).length ? { programme } : {}), ...(query.activityTemplateId ? { activityTemplateId: query.activityTemplateId } : {}), ...(Object.keys(activityTemplate).length ? { activityTemplate } : {}), ...(query.createdByUserId ? { createdByUserId: query.createdByUserId } : {}), ...(query.reviewMode ? { reviewMode: query.reviewMode } : {}), ...(query.scoringMode ? { scoringMode: query.scoringMode } : {}), ...(query.search ? { OR: [{ code: { contains: query.search, mode: "insensitive" } }, { title: { contains: query.search, mode: "insensitive" } }, { description: { contains: query.search, mode: "insensitive" } }, { instructions: { contains: query.search, mode: "insensitive" } }, { learningOutcome: { contains: query.search, mode: "insensitive" } }] } : {}), ...(curriculum.length ? { curriculumLinks: { some: { AND: curriculum } } } : {}), ...(media.length ? { AND: media } : {}) }; }
export async function listDigitalActivities(query: ListDigitalActivitiesQuery, context: DigitalActivityAuditContext) { read(context); const filter = where(query, context); const [records, total] = await Promise.all([prisma.digitalActivity.findMany({ where: filter, include, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { [query.sortBy]: query.sortOrder } as Prisma.DigitalActivityOrderByWithRelationInput }), prisma.digitalActivity.count({ where: filter })]); const totalPages = Math.ceil(total / query.limit); return { activities: records.map(dto), pagination: { page: query.page, limit: query.limit, total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } }; }
type PreviewQuestionBankItem = PreviewActivityRecord["items"][number]["questionBankItem"];
type PreviewQuestionBankMedia = PreviewQuestionBankItem["mediaLinks"][number];

function previewQuestionBankMedia(media: PreviewQuestionBankMedia) {
  assertSafeStorageKey(media.mediaKey);
  return {
    id: media.id,
    questionBankItemId: media.questionBankItemId,
    key: media.mediaKey,
    mediaKey: media.mediaKey,
    url: getStorageAdapter().getPublicUrl(media.mediaKey),
    mimeType: media.mimeType,
    role: media.mediaRole,
    mediaRole: media.mediaRole,
    label: media.originalName,
    originalName: media.originalName,
    altText: media.altText,
    sequence: media.sequence,
    createdAt: media.createdAt,
  };
}

function previewQuestionBankItem(item: PreviewQuestionBankItem) {
  return {
    id: item.id,
    code: null,
    type: item.type,
    title: item.title,
    content: item.content,
    normalizedContent: item.normalizedText,
    phoneticPattern: item.languagePattern,
    instructions: item.instructions,
    explanation: item.explanation,
    answerType: item.answerType,
    correctAnswer: item.correctAnswer,
    difficulty: item.difficulty,
    metadata: item.metadata,
    status: item.status,
    programmeId: item.programmeId,
    answerOptions: item.answerOptions.map((option) => ({
      id: option.id,
      label: option.label,
      content: option.content,
      sequence: option.sequence,
      isCorrect: option.isCorrect,
      feedback: null,
      media: [],
    })),
    mediaLinks: item.mediaLinks.map(previewQuestionBankMedia),
  };
}

async function previewFillBlankMedia(record: PreviewActivityRecord): Promise<ReadonlyMap<string, FillBlankPreviewMediaDescriptor>> {
  const configurations = record.items.flatMap((item) => {
    try { return [validateFillBlankConfiguration(item.configuration)]; } catch { return []; }
  });
  const keys = new Set(configurations.flatMap(fillBlankMediaKeys));
  if (keys.size === 0) return new Map<string, FillBlankPreviewMediaDescriptor>();
  const descriptors = new Map<string, FillBlankPreviewMediaDescriptor>();
  const add = (key: string, descriptor: Omit<FillBlankPreviewMediaDescriptor, "url">): void => {
    assertSafeStorageKey(key);
    descriptors.set(key, { ...descriptor, url: getStorageAdapter().getPublicUrl(key) });
  };
  for (const item of record.items) {
    for (const media of item.questionBankItem.mediaLinks) {
      if (keys.has(media.mediaKey) && !descriptors.has(media.mediaKey)) {
        add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.originalName });
      }
    }
  }
  const activityMedia = await prisma.digitalActivityMedia.findMany({
    where: { digitalActivityId: record.id, mediaKey: { in: [...keys] } },
    select: { mediaKey: true, mimeType: true, altText: true, label: true },
  });
  for (const media of activityMedia) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.label });
  for (const key of keys) {
    if (!descriptors.has(key)) add(key, {});
  }
  return descriptors;
}

async function previewWordBuilderMedia(record: PreviewActivityRecord): Promise<ReadonlyMap<string, WordBuilderPreviewMediaDescriptor>> {
  const configurations = record.items.flatMap((item) => {
    try { return [validateWordBuilderConfiguration(item.configuration)]; } catch { return []; }
  });
  const keys = new Set(configurations.flatMap(wordBuilderMediaKeys));
  if (keys.size === 0) return new Map<string, WordBuilderPreviewMediaDescriptor>();
  const descriptors = new Map<string, WordBuilderPreviewMediaDescriptor>();
  const add = (key: string, descriptor: Omit<WordBuilderPreviewMediaDescriptor, "url">): void => {
    assertSafeStorageKey(key);
    descriptors.set(key, { ...descriptor, url: getStorageAdapter().getPublicUrl(key) });
  };
  for (const item of record.items) {
    for (const media of item.questionBankItem.mediaLinks) {
      if (keys.has(media.mediaKey) && !descriptors.has(media.mediaKey)) {
        add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.originalName });
      }
    }
  }
  const activityMedia = await prisma.digitalActivityMedia.findMany({
    where: { digitalActivityId: record.id, mediaKey: { in: [...keys] } },
    select: { mediaKey: true, mimeType: true, altText: true, label: true },
  });
  for (const media of activityMedia) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.label });
  for (const key of keys) {
    if (!descriptors.has(key)) add(key, {});
  }
  return descriptors;
}

async function previewCopyWritingMedia(record: PreviewActivityRecord): Promise<ReadonlyMap<string, CopyWritingPreviewMediaDescriptor>> {
  const configurations = record.items.flatMap((item) => {
    try { return [validateCopyWritingConfiguration(item.configuration)]; } catch { return []; }
  });
  const keys = new Set(configurations.flatMap(copyWritingMediaKeys));
  if (keys.size === 0) return new Map<string, CopyWritingPreviewMediaDescriptor>();
  const descriptors = new Map<string, CopyWritingPreviewMediaDescriptor>();
  const add = (key: string, descriptor: Omit<CopyWritingPreviewMediaDescriptor, "url">): void => {
    assertSafeStorageKey(key);
    descriptors.set(key, { ...descriptor, url: getStorageAdapter().getPublicUrl(key) });
  };
  for (const item of record.items) {
    for (const media of item.questionBankItem.mediaLinks) {
      if (keys.has(media.mediaKey) && !descriptors.has(media.mediaKey)) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.originalName });
    }
  }
  const activityMedia = await prisma.digitalActivityMedia.findMany({
    where: { digitalActivityId: record.id, mediaKey: { in: [...keys] } },
    select: { mediaKey: true, mimeType: true, altText: true, label: true },
  });
  for (const media of activityMedia) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.label });
  for (const key of keys) if (!descriptors.has(key)) add(key, {});
  return descriptors;
}

async function previewReadingMedia(record: PreviewActivityRecord): Promise<ReadonlyMap<string, ReadingPreviewMediaDescriptor>> {
  const configurations = record.items.flatMap((item) => {
    try { return [validateReadingConfiguration(item.configuration)]; } catch { return []; }
  });
  const keys = new Set(configurations.flatMap(readingMediaKeys));
  if (keys.size === 0) return new Map<string, ReadingPreviewMediaDescriptor>();
  const descriptors = new Map<string, ReadingPreviewMediaDescriptor>();
  const add = (key: string, descriptor: Omit<ReadingPreviewMediaDescriptor, "url">): void => {
    assertSafeStorageKey(key);
    descriptors.set(key, { ...descriptor, url: getStorageAdapter().getPublicUrl(key) });
  };
  for (const item of record.items) {
    for (const media of item.questionBankItem.mediaLinks) {
      if (keys.has(media.mediaKey) && !descriptors.has(media.mediaKey)) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.originalName });
    }
  }
  const activityMedia = await prisma.digitalActivityMedia.findMany({
    where: { digitalActivityId: record.id, mediaKey: { in: [...keys] } },
    select: { mediaKey: true, mimeType: true, altText: true, label: true },
  });
  for (const media of activityMedia) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.label });
  for (const key of keys) if (!descriptors.has(key)) add(key, {});
  return descriptors;
}

async function previewFreeHandwritingMedia(record: PreviewActivityRecord): Promise<ReadonlyMap<string, FreeHandwritingPreviewMediaDescriptor>> {
  const configurations = record.items.flatMap((item) => { try { return [validateFreeHandwritingConfiguration(item.configuration)]; } catch { return []; } });
  const keys = new Set(configurations.flatMap(freeHandwritingMediaKeys));
  if (keys.size === 0) return new Map<string, FreeHandwritingPreviewMediaDescriptor>();
  const descriptors = new Map<string, FreeHandwritingPreviewMediaDescriptor>();
  const add = (key: string, descriptor: Omit<FreeHandwritingPreviewMediaDescriptor, "url">): void => { assertSafeStorageKey(key); descriptors.set(key, { ...descriptor, url: getStorageAdapter().getPublicUrl(key) }); };
  for (const item of record.items) for (const media of item.questionBankItem.mediaLinks) if (keys.has(media.mediaKey) && !descriptors.has(media.mediaKey)) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.originalName });
  const activityMedia = await prisma.digitalActivityMedia.findMany({ where: { digitalActivityId: record.id, mediaKey: { in: [...keys] } }, select: { mediaKey: true, mimeType: true, altText: true, label: true } });
  for (const media of activityMedia) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.label });
  for (const key of keys) if (!descriptors.has(key)) add(key, {});
  return descriptors;
}
async function previewReadingComprehensionMedia(record: PreviewActivityRecord): Promise<ReadonlyMap<string, ReadingComprehensionPreviewMediaDescriptor>> { const configurations = record.items.flatMap((item) => { try { return [validateReadingComprehensionConfiguration(item.configuration)]; } catch { return []; } }); const keys = new Set(configurations.flatMap(readingComprehensionMediaKeys)); if (keys.size === 0) return new Map<string, ReadingComprehensionPreviewMediaDescriptor>(); const descriptors = new Map<string, ReadingComprehensionPreviewMediaDescriptor>(); const add = (key: string, descriptor: Omit<ReadingComprehensionPreviewMediaDescriptor, "url">): void => { assertSafeStorageKey(key); descriptors.set(key, { ...descriptor, url: getStorageAdapter().getPublicUrl(key) }); }; for (const item of record.items) for (const media of item.questionBankItem.mediaLinks) if (keys.has(media.mediaKey) && !descriptors.has(media.mediaKey)) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.originalName }); const activityMedia = await prisma.digitalActivityMedia.findMany({ where: { digitalActivityId: record.id, mediaKey: { in: [...keys] } }, select: { mediaKey: true, mimeType: true, altText: true, label: true } }); for (const media of activityMedia) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.label }); for (const key of keys) if (!descriptors.has(key)) add(key, {}); return descriptors; }
async function previewVoiceRecordingMedia(record: PreviewActivityRecord): Promise<ReadonlyMap<string, VoiceRecordingPreviewMediaDescriptor>> { const configurations = record.items.flatMap((item) => { try { return [validateVoiceRecordingConfiguration(item.configuration)]; } catch { return []; } }); const keys = new Set(configurations.flatMap(voiceRecordingMediaKeys)); if (keys.size === 0) return new Map<string, VoiceRecordingPreviewMediaDescriptor>(); const descriptors = new Map<string, VoiceRecordingPreviewMediaDescriptor>(); const add = (key: string, descriptor: Omit<VoiceRecordingPreviewMediaDescriptor, "url">): void => { assertSafeStorageKey(key); descriptors.set(key, { ...descriptor, url: getStorageAdapter().getPublicUrl(key) }); }; for (const item of record.items) for (const media of item.questionBankItem.mediaLinks) if (keys.has(media.mediaKey) && !descriptors.has(media.mediaKey)) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.originalName }); const activityMedia = await prisma.digitalActivityMedia.findMany({ where: { digitalActivityId: record.id, mediaKey: { in: [...keys] } }, select: { mediaKey: true, mimeType: true, altText: true, label: true } }); for (const media of activityMedia) add(media.mediaKey, { mimeType: media.mimeType, altText: media.altText, label: media.label }); for (const key of keys) if (!descriptors.has(key)) add(key, {}); return descriptors; }

function previewFillBlankItemConfiguration(configuration: unknown, questionBankItem: PreviewQuestionBankItem, media: ReadonlyMap<string, FillBlankPreviewMediaDescriptor>) {
  try {
    return { configuration: fillBlankPreviewConfiguration(validateFillBlankConfiguration(configuration), media), legacyFillBlank: null };
  } catch {
    // Legacy single-answer items remain readable to management users. No marker map
    // is inferred from QuestionBankItem.correctAnswer, and workflow validation blocks
    // these incomplete items until the explicit item configuration is supplied.
    return {
      configuration,
      legacyFillBlank: {
        incomplete: true,
        reason: "EXPLICIT_FILL_BLANK_CONTRACT_REQUIRED",
        legacyCorrectAnswerPresent: questionBankItem.correctAnswer !== null,
      },
    };
  }
}

function previewArrangeLettersItemConfiguration(configuration: unknown) {
  try {
    return { configuration: arrangeLettersPreviewConfiguration(validateArrangeLettersConfiguration(configuration)), legacyArrangeLetters: null };
  } catch {
    // Legacy items stay readable, but the player must never infer a target word
    // or letter-unit sequence from question-bank fields. Do not reflect an
    // unvalidated legacy configuration, which could contain unsafe storage or
    // filesystem metadata.
    return {
      configuration: null,
      legacyArrangeLetters: {
        incomplete: true,
        reason: "EXPLICIT_ARRANGE_LETTERS_CONTRACT_REQUIRED",
      },
    };
  }
}

function previewArrangeSyllablesItemConfiguration(configuration: unknown) {
  try {
    return { configuration: arrangeSyllablesPreviewConfiguration(validateArrangeSyllablesConfiguration(configuration)), legacyArrangeSyllables: null };
  } catch {
    // Legacy items stay readable, but syllables must never be inferred from a
    // target word or QuestionBankItem fields. Do not reflect unvalidated JSON.
    return {
      configuration: null,
      legacyArrangeSyllables: {
        incomplete: true,
        reason: "EXPLICIT_ARRANGE_SYLLABLES_CONTRACT_REQUIRED",
      },
    };
  }
}

function previewWordBuilderItemConfiguration(configuration: unknown, media: ReadonlyMap<string, WordBuilderPreviewMediaDescriptor>) {
  try {
    return { configuration: wordBuilderPreviewConfiguration(validateWordBuilderConfiguration(configuration), media), legacyWordBuilder: null };
  } catch {
    // Legacy records remain visible to management users but never expose an
    // inferred unit, distractor, or unvalidated configuration payload.
    return {
      configuration: null,
      legacyWordBuilder: {
        incomplete: true,
        reason: "EXPLICIT_WORD_BUILDER_CONTRACT_REQUIRED",
      },
    };
  }
}

function previewTracingItemConfiguration(configuration: unknown) {
  try {
    return { configuration: tracingPreviewConfiguration(validateTracingConfiguration(configuration)), legacyTracing: null };
  } catch {
    // Legacy tracing records remain readable but never receive generated paths
    // or an unvalidated configuration payload in preview.
    return {
      configuration: null,
      legacyTracing: {
        incomplete: true,
        reason: "EXPLICIT_TRACING_CONTRACT_REQUIRED",
      },
    };
  }
}

function previewCopyWritingItemConfiguration(configuration: unknown, media: ReadonlyMap<string, CopyWritingPreviewMediaDescriptor>) {
  try {
    return { configuration: copyWritingPreviewConfiguration(validateCopyWritingConfiguration(configuration), media), legacyCopyWriting: null };
  } catch {
    // Legacy Copy Writing records stay readable without inferring a model text,
    // writing layout, repetitions, or canvas dimensions from other fields.
    return {
      configuration: null,
      legacyCopyWriting: {
        incomplete: true,
        reason: "EXPLICIT_COPY_WRITING_CONTRACT_REQUIRED",
      },
    };
  }
}

function previewReadingItemConfiguration(configuration: unknown, media: ReadonlyMap<string, ReadingPreviewMediaDescriptor>) {
  try {
    return { configuration: readingPreviewConfiguration(validateReadingConfiguration(configuration), media), legacyReading: null };
  } catch {
    // Legacy Reading items stay visible to management users but must never get
    // inferred paragraphs, syllables, media mappings, or guided-reading state.
    return {
      configuration: null,
      legacyReading: {
        incomplete: true,
        reason: "EXPLICIT_READING_CONTRACT_REQUIRED",
      },
    };
  }
}
function previewFreeHandwritingItemConfiguration(configuration: unknown, media: ReadonlyMap<string, FreeHandwritingPreviewMediaDescriptor>) { try { return { configuration: freeHandwritingPreviewConfiguration(validateFreeHandwritingConfiguration(configuration), media), legacyFreeHandwriting: null }; } catch { return { configuration: null, legacyFreeHandwriting: { incomplete: true, reason: "EXPLICIT_FREE_HANDWRITING_CONTRACT_REQUIRED" } }; } }
function previewReadingComprehensionItemConfiguration(configuration: unknown, media: ReadonlyMap<string, ReadingComprehensionPreviewMediaDescriptor>) { try { return { configuration: readingComprehensionPreviewConfiguration(validateReadingComprehensionConfiguration(configuration), media), legacyReadingComprehension: null }; } catch { return { configuration: null, legacyReadingComprehension: { incomplete: true, reason: "EXPLICIT_READING_COMPREHENSION_CONTRACT_REQUIRED" } }; } }
function previewVoiceRecordingItemConfiguration(configuration: unknown, media: ReadonlyMap<string, VoiceRecordingPreviewMediaDescriptor>) { try { return { configuration: voiceRecordingPreviewConfiguration(validateVoiceRecordingConfiguration(configuration), media), legacyVoiceRecording: null }; } catch { return { configuration: null, legacyVoiceRecording: { incomplete: true, reason: "EXPLICIT_VOICE_RECORDING_CONTRACT_REQUIRED" } }; } }

async function previewDto(record: PreviewActivityRecord) {
  const fillBlankMedia = record.activityTemplate.rendererKey === "fill-blank"
    ? await previewFillBlankMedia(record)
    : new Map<string, FillBlankPreviewMediaDescriptor>();
  const wordBuilderMedia = record.activityTemplate.rendererKey === "word-builder"
    ? await previewWordBuilderMedia(record)
    : new Map<string, WordBuilderPreviewMediaDescriptor>();
  const copyWritingMedia = record.activityTemplate.rendererKey === "copy-writing"
    ? await previewCopyWritingMedia(record)
    : new Map<string, CopyWritingPreviewMediaDescriptor>();
  const readingMedia = record.activityTemplate.rendererKey === "reading"
    ? await previewReadingMedia(record)
    : new Map<string, ReadingPreviewMediaDescriptor>();
  const freeHandwritingMedia = record.activityTemplate.rendererKey === "free-handwriting"
    ? await previewFreeHandwritingMedia(record)
    : new Map<string, FreeHandwritingPreviewMediaDescriptor>();
  const readingComprehensionMedia = record.activityTemplate.code === "READING_COMPREHENSION"
    ? await previewReadingComprehensionMedia(record)
    : new Map<string, ReadingComprehensionPreviewMediaDescriptor>();
  const voiceRecordingMedia = record.activityTemplate.rendererKey === "voice-recording"
    ? await previewVoiceRecordingMedia(record)
    : new Map<string, VoiceRecordingPreviewMediaDescriptor>();
  return {
    activity: {
      id: record.id,
      code: record.code,
      title: record.title,
      description: record.description,
      instructions: record.instructions,
      learningOutcome: record.learningOutcome,
      difficulty: record.difficulty,
      scoringMode: record.scoringMode,
      reviewMode: record.reviewMode,
      totalMarks: record.totalMarks,
      masteryThreshold: record.masteryThreshold,
      estimatedMinutes: record.estimatedMinutes,
      attemptsAllowed: record.attemptsAllowed,
      timeLimitSeconds: record.timeLimitSeconds,
      shuffleItems: record.shuffleItems,
      showImmediateFeedback: record.showImmediateFeedback,
      allowRetry: record.allowRetry,
      configuration: record.configuration,
      rewardConfiguration: record.rewardConfiguration,
      presentationSettings: record.presentationSettings,
      status: record.status,
      template: {
        id: record.activityTemplate.id,
        code: record.activityTemplate.code,
        version: record.activityTemplate.version,
        name: record.activityTemplate.name,
        category: record.activityTemplate.category,
        assessmentMode: record.activityTemplate.assessmentMode,
        rendererKey: record.activityTemplate.rendererKey,
        teacherReviewRequired: record.activityTemplate.requiresTeacherReview,
        aiSupported: record.activityTemplate.supportsFutureAI,
        capabilities: {
          autoMarking: record.activityTemplate.supportsAutoMarking,
          media: record.activityTemplate.supportsMedia,
          audio: record.activityTemplate.supportsAudio,
          video: record.activityTemplate.supportsVideo,
          drawing: record.activityTemplate.supportsDrawing,
          voiceRecording: record.activityTemplate.supportsVoiceRecording,
        },
        configurationSchema: record.activityTemplate.configurationSchema,
      },
      items: record.items.map((item) => {
        const fillBlank = record.activityTemplate.rendererKey === "fill-blank"
          ? previewFillBlankItemConfiguration(item.configuration, item.questionBankItem, fillBlankMedia)
          : null;
        const arrangeLetters = record.activityTemplate.rendererKey === "arrange-letters"
          ? previewArrangeLettersItemConfiguration(item.configuration)
          : null;
        const arrangeSyllables = record.activityTemplate.rendererKey === "arrange-syllables"
          ? previewArrangeSyllablesItemConfiguration(item.configuration)
          : null;
        const wordBuilder = record.activityTemplate.rendererKey === "word-builder"
          ? previewWordBuilderItemConfiguration(item.configuration, wordBuilderMedia)
          : null;
        const tracing = record.activityTemplate.rendererKey === "tracing"
          ? previewTracingItemConfiguration(item.configuration)
          : null;
        const copyWriting = record.activityTemplate.rendererKey === "copy-writing"
          ? previewCopyWritingItemConfiguration(item.configuration, copyWritingMedia)
          : null;
        const reading = record.activityTemplate.rendererKey === "reading"
          ? previewReadingItemConfiguration(item.configuration, readingMedia)
          : null;
        const freeHandwriting = record.activityTemplate.rendererKey === "free-handwriting"
          ? previewFreeHandwritingItemConfiguration(item.configuration, freeHandwritingMedia)
          : null;
        const readingComprehension = record.activityTemplate.code === "READING_COMPREHENSION"
          ? previewReadingComprehensionItemConfiguration(item.configuration, readingComprehensionMedia)
          : null;
        const voiceRecording = record.activityTemplate.rendererKey === "voice-recording"
          ? previewVoiceRecordingItemConfiguration(item.configuration, voiceRecordingMedia)
          : null;
        return {
          id: item.id,
          digitalActivityItemId: item.id,
          sequence: item.sequence,
          sectionKey: item.sectionKey,
          isRequired: item.isRequired,
          marks: item.marks,
          configuration: fillBlank?.configuration ?? arrangeLetters?.configuration ?? arrangeSyllables?.configuration ?? wordBuilder?.configuration ?? tracing?.configuration ?? copyWriting?.configuration ?? reading?.configuration ?? freeHandwriting?.configuration ?? readingComprehension?.configuration ?? voiceRecording?.configuration ?? item.configuration,
          itemConfiguration: fillBlank?.configuration ?? arrangeLetters?.configuration ?? arrangeSyllables?.configuration ?? wordBuilder?.configuration ?? tracing?.configuration ?? copyWriting?.configuration ?? reading?.configuration ?? freeHandwriting?.configuration ?? readingComprehension?.configuration ?? voiceRecording?.configuration ?? item.configuration,
          ...(fillBlank ? { legacyFillBlank: fillBlank.legacyFillBlank } : {}),
          ...(arrangeLetters ? { legacyArrangeLetters: arrangeLetters.legacyArrangeLetters } : {}),
          ...(arrangeSyllables ? { legacyArrangeSyllables: arrangeSyllables.legacyArrangeSyllables } : {}),
          ...(wordBuilder ? { legacyWordBuilder: wordBuilder.legacyWordBuilder } : {}),
          ...(tracing ? { legacyTracing: tracing.legacyTracing } : {}),
          ...(copyWriting ? { legacyCopyWriting: copyWriting.legacyCopyWriting } : {}),
          ...(reading ? { legacyReading: reading.legacyReading } : {}),
          ...(freeHandwriting ? { legacyFreeHandwriting: freeHandwriting.legacyFreeHandwriting } : {}),
          ...(readingComprehension ? { legacyReadingComprehension: readingComprehension.legacyReadingComprehension } : {}),
          ...(voiceRecording ? { legacyVoiceRecording: voiceRecording.legacyVoiceRecording } : {}),
          questionBankItem: previewQuestionBankItem(item.questionBankItem),
        };
      }),
      media: record.mediaLinks.map((media) => ({
        id: media.id,
        mediaKey: media.mediaKey,
        mediaRole: media.mediaRole,
        mimeType: media.mimeType,
        label: media.label,
        altText: media.altText,
        sequence: media.sequence,
        isPrimary: media.isPrimary,
        url: getStorageAdapter().getPublicUrl(media.mediaKey),
      })),
    },
  };
}

export async function previewDigitalActivity(activityId: string, context: DigitalActivityAuditContext) { const record = await getPreview(activityId); visible(record, context); return previewDto(record); }

/**
 * Student delivery reuses the validated renderer mapping used by preview, then
 * removes workflow, curriculum, audit and authoring metadata. Correct-answer
 * fields remain temporarily because the current player renderers perform local
 * validation; this must move to server-side validation before those fields can
 * be removed from the browser contract.
 */
export async function studentDeliveryActivity(activityId: string) {
  const preview = (await previewDto(await getPreview(activityId))).activity;
  return {
    id: preview.id,
    code: preview.code,
    title: preview.title,
    instructions: preview.instructions,
    difficulty: preview.difficulty,
    scoringMode: preview.scoringMode,
    reviewMode: preview.reviewMode,
    attemptsAllowed: preview.attemptsAllowed,
    timeLimitSeconds: preview.timeLimitSeconds,
    shuffleItems: preview.shuffleItems,
    showImmediateFeedback: preview.showImmediateFeedback,
    allowRetry: preview.allowRetry,
    configuration: preview.configuration,
    rewardConfiguration: preview.rewardConfiguration,
    presentationSettings: preview.presentationSettings,
    template: {
      code: preview.template.code,
      version: preview.template.version,
      rendererKey: preview.template.rendererKey,
    },
    items: preview.items.map((item) => ({
      id: item.id,
      sequence: item.sequence,
      sectionKey: item.sectionKey,
      isRequired: item.isRequired,
      marks: item.marks,
      configuration: item.configuration,
      questionBankItem: {
        id: item.questionBankItem.id,
        type: item.questionBankItem.type,
        title: item.questionBankItem.title,
        content: item.questionBankItem.content,
        instructions: item.questionBankItem.instructions,
        answerType: item.questionBankItem.answerType,
        correctAnswer: item.questionBankItem.correctAnswer,
        difficulty: item.questionBankItem.difficulty,
        programmeId: item.questionBankItem.programmeId,
        answerOptions: item.questionBankItem.answerOptions.map((option) => ({
          id: option.id,
          label: option.label,
          content: option.content,
          sequence: option.sequence,
          isCorrect: option.isCorrect,
          feedback: option.feedback,
          media: option.media,
        })),
        mediaLinks: item.questionBankItem.mediaLinks.map((media) => ({
          id: media.id,
          key: media.key,
          mediaKey: media.mediaKey,
          url: media.url,
          mimeType: media.mimeType,
          role: media.role,
          mediaRole: media.mediaRole,
          label: media.label,
          altText: media.altText,
          sequence: media.sequence,
        })),
      },
    })),
    media: preview.media.map((media) => ({
      id: media.id,
      mediaKey: media.mediaKey,
      mediaRole: media.mediaRole,
      mimeType: media.mimeType,
      label: media.label,
      altText: media.altText,
      sequence: media.sequence,
      isPrimary: media.isPrimary,
      url: media.url,
    })),
  };
}
export async function listDigitalActivityReviewHistory(activityId: string, context: DigitalActivityAuditContext) { const record = await get(activityId); visible(record, context); return dto(record).reviewHistory; }
