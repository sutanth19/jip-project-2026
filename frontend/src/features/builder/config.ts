import type { BuilderEntityConfig, WizardStep } from "@/features/builder/types/builder.types";

export const recordStatuses = [
  { label: "Aktif", value: "ACTIVE" },
  { label: "Draf", value: "DRAFT" },
  { label: "Diterbitkan", value: "PUBLISHED" },
  { label: "Diarkibkan", value: "ARCHIVED" },
  { label: "Tidak aktif", value: "INACTIVE" },
];

export const questionTypes = [
  "LETTER",
  "SYLLABLE",
  "WORD",
  "PHRASE",
  "SENTENCE",
  "PASSAGE",
  "QUESTION",
].map((value) => ({ label: value.replaceAll("_", " "), value }));

export const answerTypes = [
  "NONE",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TEXT",
  "BOOLEAN",
  "ORDERED_ITEMS",
  "MATCHING_PAIRS",
].map((value) => ({ label: value.replaceAll("_", " "), value }));

export const difficulties = ["BEGINNER", "EASY", "MEDIUM", "HARD", "ADVANCED"].map((value) => ({
  label: value,
  value,
}));

export const rendererKeys = [
  "multiple-choice",
  "matching",
  "drag-drop",
  "fill-blank",
  "arrange-syllables",
  "arrange-letters",
  "word-builder",
  "tracing",
  "copy-writing",
  "free-handwriting",
  "reading",
  "reading-comprehension",
  "voice-recording",
].map((value) => ({ label: value, value }));

export const activityWizardSteps: WizardStep[] = [
  { id: "basic", title: "Maklumat Asas", description: "Tajuk, arahan dan hasil pembelajaran." },
  { id: "curriculum", title: "Pemetaan Kurikulum", description: "Program, kemahiran, SK, SP dan objektif." },
  { id: "template", title: "Templat Aktiviti", description: "Pilih renderer dan kontrak aktiviti." },
  { id: "questions", title: "Soalan", description: "Konfigurasi item berdasarkan jenis aktiviti." },
  { id: "media", title: "Media", description: "Imej, audio dan rujukan media tanpa laluan storan mentah." },
  { id: "scoring", title: "Markah", description: "Mod pentaksiran, markah dan ambang penguasaan." },
  { id: "settings", title: "Tetapan", description: "Cubaan, masa, rawak dan maklum balas." },
  { id: "preview", title: "Pratonton", description: "Gunakan Activity Player sedia ada." },
  { id: "review", title: "Hantar Semakan", description: "Submit draft kepada aliran review." },
  { id: "publish", title: "Terbit", description: "Super Admin sahaja mengikut backend." },
];

export const builderEntities: BuilderEntityConfig[] = [
  {
    key: "curriculumVersions",
    title: "Versi Kurikulum",
    singular: "Versi Kurikulum",
    description: "Create/update Admin; publish/archive Super Admin-only.",
    path: "/curriculum/versions",
    endpoint: "/curriculum/versions",
    roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
    manageRoles: ["SUPER_ADMIN", "ADMIN"],
    searchable: true,
    statusFilter: true,
    supportsCreate: true,
    supportsEdit: true,
    columns: [
      { key: "code", label: "Kod" },
      { key: "name", label: "Nama" },
      { key: "status", label: "Status", kind: "status" },
      { key: "sourceYear", label: "Tahun" },
      { key: "publishedAt", label: "Diterbitkan", kind: "date" },
    ],
    fields: [
      { name: "code", label: "Kod", required: true },
      { name: "name", label: "Nama", required: true },
      { name: "description", label: "Penerangan", type: "textarea" },
      { name: "sourceYear", label: "Tahun sumber", type: "number" },
      { name: "effectiveFrom", label: "Berkuat kuasa dari", type: "date" },
      { name: "effectiveTo", label: "Berkuat kuasa hingga", type: "date" },
    ],
    unsupportedActions: ["Compare versions endpoint is not present."],
  },
  {
    key: "programmes",
    title: "Program",
    singular: "Program",
    description: "Program kurikulum memerlukan curriculumVersionId dan subjectId.",
    path: "/curriculum/programmes",
    endpoint: "/curriculum/programmes",
    roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
    manageRoles: ["SUPER_ADMIN", "ADMIN"],
    searchable: true,
    statusFilter: true,
    supportsCreate: true,
    supportsEdit: true,
    columns: [
      { key: "code", label: "Kod" },
      { key: "name", label: "Nama" },
      { key: "status", label: "Status", kind: "status" },
      { key: "updatedAt", label: "Dikemas kini", kind: "date" },
    ],
    fields: [
      { name: "curriculumVersionId", label: "ID versi kurikulum", required: true },
      { name: "subjectId", label: "ID subjek", required: true },
      { name: "code", label: "Kod", required: true },
      { name: "name", label: "Nama", required: true },
      { name: "description", label: "Penerangan", type: "textarea" },
    ],
    editFieldNames: ["subjectId", "code", "name", "description", "status"],
  },
  {
    key: "questionBank",
    title: "Bank Soalan",
    singular: "Soalan",
    description: "Question Bank items with curriculum links, media, options and activation/archive actions.",
    path: "/question-bank",
    endpoint: "/question-bank/items",
    roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
    manageRoles: ["SUPER_ADMIN", "ADMIN"],
    searchable: true,
    statusFilter: true,
    supportsCreate: true,
    supportsEdit: true,
    columns: [
      { key: "title", label: "Tajuk" },
      { key: "type", label: "Jenis", kind: "badge" },
      { key: "difficulty", label: "Kesukaran", kind: "badge" },
      { key: "status", label: "Status", kind: "status" },
      { key: "updatedAt", label: "Dikemas kini", kind: "date" },
    ],
    fields: [
      { name: "programmeId", label: "ID program", required: true },
      { name: "type", label: "Jenis", type: "select", options: questionTypes, required: true },
      { name: "title", label: "Tajuk" },
      { name: "content", label: "Kandungan", type: "textarea", required: true },
      { name: "instructions", label: "Arahan", type: "textarea" },
      { name: "explanation", label: "Penerangan", type: "textarea" },
      { name: "answerType", label: "Jenis jawapan", type: "select", options: answerTypes },
      { name: "difficulty", label: "Kesukaran", type: "select", options: difficulties, required: true },
      { name: "sourceReference", label: "Rujukan sumber" },
    ],
    editFieldNames: ["title", "content", "instructions", "explanation", "answerType", "difficulty", "sourceReference"],
  },
  {
    key: "activityTemplates",
    title: "Templat Aktiviti",
    singular: "Templat Aktiviti",
    description: "Registry read for Admin/Teacher; edits are Super Admin-only.",
    path: "/activity-templates",
    endpoint: "/activity-templates",
    roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
    manageRoles: ["SUPER_ADMIN"],
    searchable: true,
    statusFilter: true,
    columns: [
      { key: "code", label: "Kod" },
      { key: "name", label: "Nama" },
      { key: "rendererKey", label: "Renderer", kind: "badge" },
      { key: "category", label: "Kategori" },
      { key: "status", label: "Status", kind: "status" },
    ],
    unsupportedActions: ["Admin and Teacher are read-only for template registry."],
  },
  {
    key: "digitalActivities",
    title: "Aktiviti Digital",
    singular: "Aktiviti Digital",
    description: "Builder uses explicit activity, item, media, review, publish and preview contracts.",
    path: "/digital-activities",
    endpoint: "/digital-activities",
    roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
    manageRoles: ["SUPER_ADMIN", "ADMIN"],
    searchable: true,
    statusFilter: true,
    supportsCreate: true,
    supportsEdit: true,
    columns: [
      { key: "code", label: "Kod" },
      { key: "title", label: "Tajuk" },
      { key: "template.rendererKey", label: "Renderer", kind: "badge" },
      { key: "difficulty", label: "Kesukaran" },
      { key: "status", label: "Status", kind: "status" },
    ],
    fields: [
      { name: "title", label: "Tajuk", required: true },
      { name: "instructions", label: "Arahan", type: "textarea", required: true },
      { name: "description", label: "Penerangan", type: "textarea" },
      { name: "learningOutcome", label: "Hasil pembelajaran", type: "textarea" },
      { name: "programmeId", label: "ID program", required: true },
      { name: "activityTemplateId", label: "ID templat aktiviti", required: true },
      { name: "difficulty", label: "Kesukaran", type: "select", options: [
        { label: "Asas", value: "BASIC" },
        { label: "Sederhana", value: "INTERMEDIATE" },
        { label: "Lanjutan", value: "ADVANCED" },
      ], required: true },
      { name: "scoringMode", label: "Mod markah", type: "select", options: [
        { label: "Tiada", value: "NONE" },
        { label: "Jumlah skor", value: "TOTAL_SCORE" },
        { label: "Peratus", value: "PERCENTAGE" },
        { label: "Ambang penguasaan", value: "MASTERY_THRESHOLD" },
      ], required: true },
      { name: "reviewMode", label: "Mod semakan", type: "select", options: [
        { label: "Automatik", value: "AUTO" },
        { label: "Guru", value: "TEACHER" },
        { label: "Hibrid", value: "HYBRID" },
        { label: "AI Assist", value: "AI_ASSISTED" },
      ], required: true },
      { name: "totalMarks", label: "Jumlah markah", type: "number" },
      { name: "masteryThreshold", label: "Ambang penguasaan", type: "number" },
      { name: "estimatedMinutes", label: "Anggaran minit", type: "number" },
    ],
    editFieldNames: ["title", "instructions", "description", "learningOutcome", "difficulty", "scoringMode", "reviewMode", "totalMarks", "masteryThreshold", "estimatedMinutes"],
  },
];

export function getBuilderEntity(key: BuilderEntityConfig["key"]): BuilderEntityConfig {
  const config = builderEntities.find((entity) => entity.key === key);
  if (!config) {
    throw new Error(`Unknown builder entity: ${key}`);
  }
  return config;
}
