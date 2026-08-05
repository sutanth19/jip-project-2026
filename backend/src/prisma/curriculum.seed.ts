import { CurriculumDomain, CurriculumRecordStatus, CurriculumStatus } from "@prisma/client";

import { bmPemulihan2019SeedData, type BmPemulihanSeedData } from "../data/curriculum/bm-pemulihan-2019.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import { dispatchAuditEvent } from "../services/audit.service.js";

export interface CurriculumSeedIssue {
  code: string;
  path: string;
  message: string;
}

export interface CurriculumSeedResult {
  dryRun: boolean;
  versionCode: string;
  created: {
    subjects: number;
    versions: number;
    programmes: number;
    years: number;
    languageStructures: number;
    remedialSkills: number;
    contentStandards: number;
    learningStandards: number;
    remedialSkillStandardMappings: number;
  };
}

export interface CurriculumSeedOptions {
  dryRun?: boolean;
}

export const BUILT_IN_BM_PEMULIHAN_VERSION_STATUS = CurriculumStatus.PUBLISHED;

export function shouldPromoteBuiltInBmPemulihanVersion(status: CurriculumStatus): boolean {
  return status === CurriculumStatus.DRAFT;
}

function issue(code: string, path: string, message: string): CurriculumSeedIssue {
  return { code, path, message };
}

export function validateBmPemulihanSeedData(data: BmPemulihanSeedData = bmPemulihan2019SeedData): CurriculumSeedIssue[] {
  const issues: CurriculumSeedIssue[] = [];
  const expectedStructures = ["PRA", "ABJAD", "SUKU_KATA", "PERKATAAN", "AYAT"];
  const codes = new Set<string>();
  const sequences = new Set<number>();
  const structureCodes = new Set(data.languageStructures.map((structure) => structure.code));

  if (data.version.code !== data.version.code.toUpperCase()) issues.push(issue("INVALID_VERSION_CODE", "version.code", "Kod versi mesti huruf besar."));
  if (data.subject.code !== "BM") issues.push(issue("INVALID_SUBJECT", "subject.code", "Kod subjek asas mestilah BM."));
  if (data.programme.code !== "BM-PEMULIHAN") issues.push(issue("INVALID_PROGRAMME", "programme.code", "Kod program asas mestilah BM-PEMULIHAN."));
  if (data.years.length !== 3 || ![1, 2, 3].every((yearLevel) => data.years.some((year) => year.yearLevel === yearLevel && year.sequence === yearLevel))) {
    issues.push(issue("INVALID_YEARS", "years", "Data asas mesti mengandungi Tahun 1 hingga Tahun 3 dengan turutan yang sah."));
  }
  if (data.languageStructures.length !== expectedStructures.length || !expectedStructures.every((code) => structureCodes.has(code))) {
    issues.push(issue("INVALID_STRUCTURES", "languageStructures", "Lima struktur bahasa BM Pemulihan mesti lengkap."));
  }
  if (new Set(data.languageStructures.map((structure) => structure.sequence)).size !== data.languageStructures.length) {
    issues.push(issue("DUPLICATE_STRUCTURE_SEQUENCE", "languageStructures", "Turutan struktur bahasa mesti unik."));
  }

  for (const skill of data.remedialSkills) {
    if (codes.has(skill.code)) issues.push(issue("DUPLICATE_SKILL_CODE", `remedialSkills.${skill.code}`, "Kod kemahiran berulang."));
    if (sequences.has(skill.sequence)) issues.push(issue("DUPLICATE_SKILL_SEQUENCE", `remedialSkills.${skill.sequence}`, "Turutan kemahiran berulang."));
    if (!structureCodes.has(skill.languageStructureCode)) issues.push(issue("UNKNOWN_STRUCTURE", `remedialSkills.${skill.code}`, "Struktur bahasa kemahiran tidak wujud."));
    codes.add(skill.code);
    sequences.add(skill.sequence);
  }

  const expectedSkillCodes = ["KP-PRA", ...Array.from({ length: 32 }, (_value, index) => `KP${String(index + 1).padStart(2, "0")}`)];
  for (const code of expectedSkillCodes) {
    if (!codes.has(code)) issues.push(issue("MISSING_SKILL", `remedialSkills.${code}`, `Kemahiran ${code} belum diwujudkan.`));
  }
  if (data.remedialSkills.length !== expectedSkillCodes.length) issues.push(issue("INVALID_SKILL_COUNT", "remedialSkills", "Data asas mesti mengandungi KP-PRA dan KP01 hingga KP32 sahaja."));

  const expectedStructureForSkill = (code: string): string => {
    if (code === "KP-PRA") return "PRA";
    const number = Number(code.slice(2));
    if (number >= 1 && number <= 3) return "ABJAD";
    if ([4, 9, 17].includes(number)) return "SUKU_KATA";
    if (number >= 5 && number <= 30) return "PERKATAAN";
    return "AYAT";
  };
  for (const skill of data.remedialSkills) {
    const expectedStructure = expectedStructureForSkill(skill.code);
    if (skill.languageStructureCode !== expectedStructure) {
      issues.push(issue("INVALID_SKILL_STRUCTURE", `remedialSkills.${skill.code}.languageStructureCode`, `${skill.code} mesti dipautkan kepada ${expectedStructure}.`));
    }
    if (skill.code === "KP-PRA" && (!skill.isPreparatory || skill.sequence !== 0)) {
      issues.push(issue("INVALID_PREPARATORY_SKILL", "remedialSkills.KP-PRA", "KP-PRA mesti merupakan kemahiran persediaan dengan turutan 0."));
    }
    if (skill.code !== "KP-PRA") {
      const number = Number(skill.code.slice(2));
      if (!Number.isInteger(number) || skill.sequence !== number || skill.isPreparatory) {
        issues.push(issue("INVALID_SKILL_SEQUENCE", `remedialSkills.${skill.code}`, "KP01 hingga KP32 mesti menggunakan turutan nombor kod dan bukan persediaan."));
      }
    }
  }
  return issues;
}

function invalidImport(issues: CurriculumSeedIssue[]): AppError {
  return new AppError("CURRICULUM_IMPORT_INVALID", 400, "Data import kurikulum tidak sah.", { issues });
}

function ensureSame(value: unknown, expected: unknown, path: string): void {
  if (value !== expected) throw invalidImport([issue("SEED_CONFLICT", path, "Rekod sedia ada berbeza dan tidak akan ditulis ganti.")]);
}

export async function seedBmPemulihanCurriculum(options: CurriculumSeedOptions = {}): Promise<CurriculumSeedResult> {
  const data = bmPemulihan2019SeedData;
  const issues = validateBmPemulihanSeedData(data);
  if (issues.length > 0) throw invalidImport(issues);
  const publicationDate = new Date();

  const result: CurriculumSeedResult = {
    dryRun: options.dryRun === true,
    versionCode: data.version.code,
    created: {
      subjects: 0,
      versions: 0,
      programmes: 0,
      years: 0,
      languageStructures: 0,
      remedialSkills: 0,
      contentStandards: 0,
      learningStandards: 0,
      remedialSkillStandardMappings: 0,
    },
  };
  if (options.dryRun) return result;

  await prisma.$transaction(async (tx) => {
    let subject = await tx.subject.findUnique({ where: { code: data.subject.code } });
    if (!subject) {
      subject = await tx.subject.create({ data: { ...data.subject, status: CurriculumRecordStatus.ACTIVE } });
      result.created.subjects += 1;
    } else {
      ensureSame(subject.name, data.subject.name, "subject.name");
    }

    let version = await tx.curriculumVersion.findUnique({ where: { code: data.version.code } });
    if (!version) {
      version = await tx.curriculumVersion.create({
        data: {
          ...data.version,
          status: BUILT_IN_BM_PEMULIHAN_VERSION_STATUS,
          publishedAt: publicationDate,
          archivedAt: null,
        },
      });
      result.created.versions += 1;
    } else {
      ensureSame(version.name, data.version.name, "version.name");
      ensureSame(version.sourceYear, data.version.sourceYear, "version.sourceYear");
      if (shouldPromoteBuiltInBmPemulihanVersion(version.status)) {
        version = await tx.curriculumVersion.update({
          where: { id: version.id },
          data: {
            status: BUILT_IN_BM_PEMULIHAN_VERSION_STATUS,
            publishedAt: version.publishedAt ?? publicationDate,
            archivedAt: null,
          },
        });
      }
    }

    let programme = await tx.curriculumProgramme.findUnique({
      where: { curriculumVersionId_code: { curriculumVersionId: version.id, code: data.programme.code } },
    });
    if (!programme) {
      programme = await tx.curriculumProgramme.create({
        data: { ...data.programme, curriculumVersionId: version.id, subjectId: subject.id, status: CurriculumRecordStatus.ACTIVE },
      });
      result.created.programmes += 1;
    } else {
      ensureSame(programme.subjectId, subject.id, "programme.subjectId");
      ensureSame(programme.name, data.programme.name, "programme.name");
    }

    const existingYears = await tx.curriculumYear.findMany({ where: { programmeId: programme.id } });
    const yearsByLevel = new Map(existingYears.map((year) => [year.yearLevel, year]));
    const yearsBySequence = new Map(existingYears.map((year) => [year.sequence, year]));
    const missingYears = [] as typeof data.years[number][];
    for (const year of data.years) {
      const existing = yearsByLevel.get(year.yearLevel);
      if (!existing) {
        const sameSequence = yearsBySequence.get(year.sequence);
        if (sameSequence) throw invalidImport([issue("SEED_CONFLICT", `years.${year.yearLevel}.sequence`, "Turutan tahun telah digunakan oleh rekod lain.")]);
        missingYears.push(year);
      } else {
        ensureSame(existing.name, year.name, `years.${year.yearLevel}.name`);
        ensureSame(existing.sequence, year.sequence, `years.${year.yearLevel}.sequence`);
      }
    }
    if (missingYears.length > 0) {
      await tx.curriculumYear.createMany({ data: missingYears.map((year) => ({ ...year, programmeId: programme.id, status: CurriculumRecordStatus.ACTIVE })) });
      result.created.years += missingYears.length;
    }

    let existingStructures = await tx.languageStructure.findMany({ where: { programmeId: programme.id } });
    const structuresByCodeBeforeCreate = new Map(existingStructures.map((structure) => [structure.code, structure]));
    const structuresBySequence = new Map(existingStructures.map((structure) => [structure.sequence, structure]));
    const missingStructures = [] as typeof data.languageStructures[number][];
    for (const structure of data.languageStructures) {
      const existing = structuresByCodeBeforeCreate.get(structure.code);
      if (!existing) {
        const sameSequence = structuresBySequence.get(structure.sequence);
        if (sameSequence) throw invalidImport([issue("SEED_CONFLICT", `languageStructures.${structure.code}.sequence`, "Turutan struktur bahasa telah digunakan oleh rekod lain.")]);
        missingStructures.push(structure);
      } else {
        ensureSame(existing.name, structure.name, `languageStructures.${structure.code}.name`);
        ensureSame(existing.sequence, structure.sequence, `languageStructures.${structure.code}.sequence`);
      }
    }
    if (missingStructures.length > 0) {
      await tx.languageStructure.createMany({ data: missingStructures.map((structure) => ({ ...structure, programmeId: programme.id, status: CurriculumRecordStatus.ACTIVE })) });
      result.created.languageStructures += missingStructures.length;
      existingStructures = await tx.languageStructure.findMany({ where: { programmeId: programme.id } });
    }
    const structuresByCode = new Map(existingStructures.map((structure) => [structure.code, structure.id]));

    const existingSkills = await tx.remedialSkill.findMany({ where: { programmeId: programme.id } });
    const skillsByCode = new Map(existingSkills.map((skill) => [skill.code, skill]));
    const skillsBySequence = new Map(existingSkills.map((skill) => [skill.sequence, skill]));
    const missingSkills: Array<{
      programmeId: string;
      languageStructureId: string;
      code: string;
      sequence: number;
      name: string;
      isPreparatory: boolean;
      status: CurriculumRecordStatus;
    }> = [];
    for (const skill of data.remedialSkills) {
      const languageStructureId = structuresByCode.get(skill.languageStructureCode);
      if (!languageStructureId) throw invalidImport([issue("UNKNOWN_STRUCTURE", `remedialSkills.${skill.code}`, "Struktur bahasa kemahiran tidak wujud.")]);
      const existing = skillsByCode.get(skill.code);
      if (!existing) {
        const sameSequence = skillsBySequence.get(skill.sequence);
        if (sameSequence) throw invalidImport([issue("SEED_CONFLICT", `remedialSkills.${skill.code}.sequence`, "Turutan kemahiran telah digunakan oleh rekod lain.")]);
        missingSkills.push({ programmeId: programme.id, languageStructureId, code: skill.code, sequence: skill.sequence, name: skill.name, isPreparatory: skill.isPreparatory, status: CurriculumRecordStatus.ACTIVE });
      } else {
        ensureSame(existing.languageStructureId, languageStructureId, `remedialSkills.${skill.code}.languageStructureId`);
        ensureSame(existing.sequence, skill.sequence, `remedialSkills.${skill.code}.sequence`);
        ensureSame(existing.name, skill.name, `remedialSkills.${skill.code}.name`);
        ensureSame(existing.isPreparatory, skill.isPreparatory, `remedialSkills.${skill.code}.isPreparatory`);
      }
    }
    if (missingSkills.length > 0) {
      await tx.remedialSkill.createMany({ data: missingSkills });
      result.created.remedialSkills += missingSkills.length;
    }

    const existingContentStandards = await tx.contentStandard.findMany({ where: { programmeId: programme.id } });
    const contentStandardsByCode = new Map(existingContentStandards.map((standard) => [`${standard.curriculumYearId}:${standard.code}`, standard]));
    const contentStandardsBySequence = new Map(existingContentStandards.map((standard) => [`${standard.curriculumYearId}:${standard.sequence ?? -1}`, standard]));
    const missingContentStandards: Array<{
      programmeId: string;
      curriculumYearId: string;
      code: string;
      title: string;
      description: string | null;
      domain: CurriculumDomain;
      sequence: number | null;
      status: CurriculumRecordStatus;
    }> = [];

    for (const contentStandard of data.contentStandards) {
      const curriculumYear = await tx.curriculumYear.findUnique({
        where: { programmeId_yearLevel: { programmeId: programme.id, yearLevel: contentStandard.yearLevel } },
        select: { id: true, yearLevel: true },
      });
      if (!curriculumYear) throw invalidImport([issue("UNKNOWN_YEAR", `contentStandards.${contentStandard.code}.yearLevel`, "Tahun kurikulum tidak wujud.")]);
      const existing = contentStandardsByCode.get(`${curriculumYear.id}:${contentStandard.code}`);
      if (!existing) {
        const sameSequence = contentStandardsBySequence.get(`${curriculumYear.id}:${contentStandard.sequence}`);
        if (sameSequence) throw invalidImport([issue("SEED_CONFLICT", `contentStandards.${contentStandard.code}.sequence`, "Turutan standard kandungan telah digunakan oleh rekod lain.")]);
        missingContentStandards.push({
          programmeId: programme.id,
          curriculumYearId: curriculumYear.id,
          code: contentStandard.code,
          title: contentStandard.title,
          description: null,
          domain: contentStandard.domain,
          sequence: contentStandard.sequence,
          status: CurriculumRecordStatus.ACTIVE,
        });
      } else {
        ensureSame(existing.title, contentStandard.title, `contentStandards.${contentStandard.code}.title`);
        ensureSame(existing.domain, contentStandard.domain, `contentStandards.${contentStandard.code}.domain`);
        ensureSame(existing.sequence, contentStandard.sequence, `contentStandards.${contentStandard.code}.sequence`);
        ensureSame(existing.curriculumYearId, curriculumYear.id, `contentStandards.${contentStandard.code}.curriculumYearId`);
      }
    }
    if (missingContentStandards.length > 0) {
      await tx.contentStandard.createMany({ data: missingContentStandards });
      result.created.contentStandards += missingContentStandards.length;
    }

    const existingContentStandardRecords = await tx.contentStandard.findMany({ where: { programmeId: programme.id } });
    const contentStandardsByComposite = new Map(existingContentStandardRecords.map((standard) => [`${standard.curriculumYearId}:${standard.code}`, standard]));
    let existingLearningStandards = await tx.learningStandard.findMany({ where: { contentStandard: { programmeId: programme.id } } });
    let learningStandardsByCode = new Map(existingLearningStandards.map((standard) => [`${standard.contentStandardId}:${standard.code}`, standard]));
    let learningStandardsBySequence = new Map(existingLearningStandards.map((standard) => [`${standard.contentStandardId}:${standard.sequence ?? -1}`, standard]));
    const missingLearningStandards: Array<{
      contentStandardId: string;
      code: string;
      description: string;
      sequence: number | null;
      status: CurriculumRecordStatus;
    }> = [];
    const pendingMappings: Array<{
      contentStandardId: string;
      learningStandardCode: string;
      skillCode: string;
    }> = [];

    for (const contentStandard of data.contentStandards) {
      const curriculumYear = await tx.curriculumYear.findUnique({
        where: { programmeId_yearLevel: { programmeId: programme.id, yearLevel: contentStandard.yearLevel } },
        select: { id: true },
      });
      if (!curriculumYear) continue;
      const existingContentStandard = contentStandardsByComposite.get(`${curriculumYear.id}:${contentStandard.code}`);
      if (!existingContentStandard) continue;

      for (const learningStandard of contentStandard.learningStandards) {
        const existing = learningStandardsByCode.get(`${existingContentStandard.id}:${learningStandard.code}`);
        if (!existing) {
          const sameSequence = learningStandardsBySequence.get(`${existingContentStandard.id}:${learningStandard.sequence}`);
          if (sameSequence) throw invalidImport([issue("SEED_CONFLICT", `learningStandards.${learningStandard.code}.sequence`, "Turutan standard pembelajaran telah digunakan oleh rekod lain.")]);
          missingLearningStandards.push({
            contentStandardId: existingContentStandard.id,
            code: learningStandard.code,
            description: learningStandard.description,
            sequence: learningStandard.sequence,
            status: CurriculumRecordStatus.ACTIVE,
          });
        } else {
          ensureSame(existing.description, learningStandard.description, `learningStandards.${learningStandard.code}.description`);
          ensureSame(existing.sequence, learningStandard.sequence, `learningStandards.${learningStandard.code}.sequence`);
        }
        for (const skillCode of learningStandard.skillCodes) {
          pendingMappings.push({ contentStandardId: existingContentStandard.id, learningStandardCode: learningStandard.code, skillCode });
        }
      }
    }
    if (missingLearningStandards.length > 0) {
      await tx.learningStandard.createMany({ data: missingLearningStandards });
      result.created.learningStandards += missingLearningStandards.length;
      existingLearningStandards = await tx.learningStandard.findMany({ where: { contentStandard: { programmeId: programme.id } } });
      learningStandardsByCode = new Map(existingLearningStandards.map((standard) => [`${standard.contentStandardId}:${standard.code}`, standard]));
      learningStandardsBySequence = new Map(existingLearningStandards.map((standard) => [`${standard.contentStandardId}:${standard.sequence ?? -1}`, standard]));
    }
    const pendingMappingRows: Array<{
      remedialSkillId: string;
      learningStandardId: string;
      isPrimary: boolean;
      notes: string | null;
    }> = [];
    const pendingMappingKeys = new Set<string>();
    for (const mapping of pendingMappings) {
      const skill = skillsByCode.get(mapping.skillCode);
      if (!skill) throw invalidImport([issue("UNKNOWN_SKILL", `learningStandards.${mapping.learningStandardCode}.skillCodes.${mapping.skillCode}`, "Kemahiran pemulihan tidak wujud.")]);
      const learningStandard = learningStandardsByCode.get(`${mapping.contentStandardId}:${mapping.learningStandardCode}`);
      if (!learningStandard) throw invalidImport([issue("UNKNOWN_LEARNING_STANDARD", `learningStandards.${mapping.learningStandardCode}`, "Standard pembelajaran tidak wujud.")]);
      const key = `${skill.id}:${learningStandard.id}`;
      if (pendingMappingKeys.has(key)) continue;
      pendingMappingKeys.add(key);
      pendingMappingRows.push({ remedialSkillId: skill.id, learningStandardId: learningStandard.id, isPrimary: true, notes: null });
    }
    if (pendingMappingRows.length > 0) {
      const mappingCreated = await tx.remedialSkillStandardMapping.createMany({ data: pendingMappingRows, skipDuplicates: true });
      result.created.remedialSkillStandardMappings += mappingCreated.count;
    }
  }, { timeout: 30_000 });

  await dispatchAuditEvent({
    actorUserId: null,
    actorProfileId: null,
    actorRole: null,
    actorName: "Curriculum seed",
    action: "CURRICULUM_IMPORTED",
    resourceType: "CURRICULUM",
    resourceId: data.version.code,
    schoolId: null,
    before: null,
    after: { versionCode: data.version.code, created: result.created },
    timestamp: new Date(),
    requestIp: null,
    userAgent: "curriculum-seed",
  });

  return result;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const result = await seedBmPemulihanCurriculum({ dryRun });
  console.log(JSON.stringify(result));
}

if (process.argv[1]?.endsWith("curriculum.seed.ts")) {
  main()
    .catch((caught: unknown) => {
      if (caught instanceof Error) console.error(caught.message);
      else console.error("Curriculum seed failed.");
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
