import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  archiveCurriculumVersion,
  createContentStandard,
  createCurriculumVersion,
  createCurriculumYear,
  createLanguageStructure,
  createLearningObjective,
  createLearningStandard,
  createProgramme,
  createRemedialSkill,
  createSkillStandardMapping,
  createSubject,
  createSuggestedTeachingActivity,
  getContentStandard,
  getCurriculumTree,
  getCurriculumVersion,
  getLearningObjective,
  getLearningStandard,
  getProgramme,
  getRemedialSkill,
  getSubject,
  getSuggestedTeachingActivity,
  listContentStandards,
  listCurriculumVersions,
  listCurriculumYears,
  listLanguageStructures,
  listLearningObjectives,
  listLearningStandards,
  listProgrammes,
  listRemedialSkills,
  listSkillStandardMappings,
  listSubjects,
  listSuggestedTeachingActivities,
  publishCurriculumVersion,
  removeSkillStandardMapping,
  updateContentStandard,
  updateCurriculumVersion,
  updateCurriculumYear,
  updateLanguageStructure,
  updateLearningObjective,
  updateLearningStandard,
  updateProgramme,
  updateRemedialSkill,
  updateSubject,
  updateSuggestedTeachingActivity,
  type CurriculumAuditContext,
} from "../services/curriculum.service.js";
import {
  activityIdParamsSchema,
  contentStandardIdParamsSchema,
  createContentStandardSchema,
  createCurriculumVersionSchema,
  createCurriculumYearSchema,
  createLanguageStructureSchema,
  createLearningObjectiveSchema,
  createLearningStandardSchema,
  createProgrammeSchema,
  createRemedialSkillSchema,
  createSkillStandardMappingSchema,
  createSubjectSchema,
  createSuggestedTeachingActivitySchema,
  curriculumTreeQuerySchema,
  learningStandardIdParamsSchema,
  listContentStandardsQuerySchema,
  listCurriculumVersionsQuerySchema,
  listCurriculumYearsQuerySchema,
  listLanguageStructuresQuerySchema,
  listLearningObjectivesQuerySchema,
  listLearningStandardsQuerySchema,
  listProgrammesQuerySchema,
  listRemedialSkillsQuerySchema,
  listSkillStandardMappingsQuerySchema,
  listSubjectsQuerySchema,
  listSuggestedTeachingActivitiesQuerySchema,
  objectiveIdParamsSchema,
  programmeIdParamsSchema,
  skillIdParamsSchema,
  skillLearningStandardParamsSchema,
  structureIdParamsSchema,
  subjectIdParamsSchema,
  updateContentStandardSchema,
  updateCurriculumVersionSchema,
  updateCurriculumYearSchema,
  updateLanguageStructureSchema,
  updateLearningObjectiveSchema,
  updateLearningStandardSchema,
  updateProgrammeSchema,
  updateRemedialSkillSchema,
  updateSubjectSchema,
  updateSuggestedTeachingActivitySchema,
  versionIdParamsSchema,
  yearIdParamsSchema,
} from "../validators/curriculum.validator.js";

function curriculumAuditContext(req: AuthenticatedRequest): CurriculumAuditContext {
  if (!req.auth) {
    throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  }

  return {
    actor: req.auth,
    requestIp: req.ip || null,
    userAgent: req.get("user-agent") || null,
  };
}

export async function createCurriculumVersionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const version = await createCurriculumVersion(
      createCurriculumVersionSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Versi kurikulum berjaya diwujudkan.", { version });
  } catch (error) {
    next(error);
  }
}

export async function listCurriculumVersionsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listCurriculumVersions(
      listCurriculumVersionsQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai versi kurikulum berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function getCurriculumVersionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { versionId } = versionIdParamsSchema.parse(req.params);
    const result = await getCurriculumVersion(
      versionId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Maklumat versi kurikulum berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateCurriculumVersionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { versionId } = versionIdParamsSchema.parse(req.params);
    const version = await updateCurriculumVersion(
      versionId,
      updateCurriculumVersionSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Versi kurikulum berjaya dikemas kini.", {
      version,
    });
  } catch (error) {
    next(error);
  }
}

export async function publishCurriculumVersionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { versionId } = versionIdParamsSchema.parse(req.params);
    const version = await publishCurriculumVersion(
      versionId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Versi kurikulum berjaya diterbitkan.", {
      version,
    });
  } catch (error) {
    next(error);
  }
}

export async function archiveCurriculumVersionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { versionId } = versionIdParamsSchema.parse(req.params);
    const version = await archiveCurriculumVersion(
      versionId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Versi kurikulum berjaya diarkibkan.", {
      version,
    });
  } catch (error) {
    next(error);
  }
}

export async function createSubjectController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const subject = await createSubject(
      createSubjectSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Subjek berjaya diwujudkan.", { subject });
  } catch (error) {
    next(error);
  }
}

export async function listSubjectsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listSubjects(
      listSubjectsQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai subjek berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function getSubjectController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { subjectId } = subjectIdParamsSchema.parse(req.params);
    const result = await getSubject(
      subjectId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Maklumat subjek berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateSubjectController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { subjectId } = subjectIdParamsSchema.parse(req.params);
    const subject = await updateSubject(
      subjectId,
      updateSubjectSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Subjek berjaya dikemas kini.", { subject });
  } catch (error) {
    next(error);
  }
}

export async function createProgrammeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const programme = await createProgramme(
      createProgrammeSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Program kurikulum berjaya diwujudkan.", {
      programme,
    });
  } catch (error) {
    next(error);
  }
}

export async function listProgrammesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listProgrammes(
      listProgrammesQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai program kurikulum berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function getProgrammeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const result = await getProgramme(
      programmeId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Maklumat program kurikulum berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateProgrammeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const programme = await updateProgramme(
      programmeId,
      updateProgrammeSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Program kurikulum berjaya dikemas kini.", {
      programme,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCurriculumYearController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const year = await createCurriculumYear(
      programmeId,
      createCurriculumYearSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Tahun kurikulum berjaya diwujudkan.", { year });
  } catch (error) {
    next(error);
  }
}

export async function listCurriculumYearsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const result = await listCurriculumYears(
      programmeId,
      listCurriculumYearsQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai tahun kurikulum berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateCurriculumYearController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { yearId } = yearIdParamsSchema.parse(req.params);
    const year = await updateCurriculumYear(
      yearId,
      updateCurriculumYearSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Tahun kurikulum berjaya dikemas kini.", { year });
  } catch (error) {
    next(error);
  }
}

export async function createLanguageStructureController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const languageStructure = await createLanguageStructure(
      programmeId,
      createLanguageStructureSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Struktur bahasa berjaya diwujudkan.", {
      languageStructure,
    });
  } catch (error) {
    next(error);
  }
}

export async function listLanguageStructuresController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const result = await listLanguageStructures(
      programmeId,
      listLanguageStructuresQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai struktur bahasa berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateLanguageStructureController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { structureId } = structureIdParamsSchema.parse(req.params);
    const languageStructure = await updateLanguageStructure(
      structureId,
      updateLanguageStructureSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Struktur bahasa berjaya dikemas kini.", {
      languageStructure,
    });
  } catch (error) {
    next(error);
  }
}

export async function createRemedialSkillController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const skill = await createRemedialSkill(
      programmeId,
      createRemedialSkillSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Kemahiran pemulihan berjaya diwujudkan.", {
      skill,
    });
  } catch (error) {
    next(error);
  }
}

export async function listRemedialSkillsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const result = await listRemedialSkills(
      programmeId,
      listRemedialSkillsQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai kemahiran pemulihan berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function getRemedialSkillController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { skillId } = skillIdParamsSchema.parse(req.params);
    const result = await getRemedialSkill(
      skillId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Maklumat kemahiran pemulihan berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateRemedialSkillController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { skillId } = skillIdParamsSchema.parse(req.params);
    const skill = await updateRemedialSkill(
      skillId,
      updateRemedialSkillSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Kemahiran pemulihan berjaya dikemas kini.", {
      skill,
    });
  } catch (error) {
    next(error);
  }
}

export async function createContentStandardController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const contentStandard = await createContentStandard(
      programmeId,
      createContentStandardSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Standard kandungan berjaya diwujudkan.", {
      contentStandard,
    });
  } catch (error) {
    next(error);
  }
}

export async function listContentStandardsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const result = await listContentStandards(
      programmeId,
      listContentStandardsQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai standard kandungan berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function getContentStandardController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { contentStandardId } = contentStandardIdParamsSchema.parse(req.params);
    const result = await getContentStandard(
      contentStandardId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Maklumat standard kandungan berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateContentStandardController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { contentStandardId } = contentStandardIdParamsSchema.parse(req.params);
    const contentStandard = await updateContentStandard(
      contentStandardId,
      updateContentStandardSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Standard kandungan berjaya dikemas kini.", {
      contentStandard,
    });
  } catch (error) {
    next(error);
  }
}

export async function createLearningStandardController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { contentStandardId } = contentStandardIdParamsSchema.parse(req.params);
    const learningStandard = await createLearningStandard(
      contentStandardId,
      createLearningStandardSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Standard pembelajaran berjaya diwujudkan.", {
      learningStandard,
    });
  } catch (error) {
    next(error);
  }
}

export async function listLearningStandardsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { contentStandardId } = contentStandardIdParamsSchema.parse(req.params);
    const result = await listLearningStandards(
      contentStandardId,
      listLearningStandardsQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai standard pembelajaran berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function getLearningStandardController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { learningStandardId } = learningStandardIdParamsSchema.parse(req.params);
    const result = await getLearningStandard(
      learningStandardId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Maklumat standard pembelajaran berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateLearningStandardController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { learningStandardId } = learningStandardIdParamsSchema.parse(req.params);
    const learningStandard = await updateLearningStandard(
      learningStandardId,
      updateLearningStandardSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Standard pembelajaran berjaya dikemas kini.", {
      learningStandard,
    });
  } catch (error) {
    next(error);
  }
}

export async function createSkillStandardMappingController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { skillId, learningStandardId } = skillLearningStandardParamsSchema.parse(
      req.params,
    );
    const mapping = await createSkillStandardMapping(
      skillId,
      learningStandardId,
      createSkillStandardMappingSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Pemetaan kemahiran dan standard berjaya diwujudkan.", {
      mapping,
    });
  } catch (error) {
    next(error);
  }
}

export async function listSkillStandardMappingsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { skillId } = skillIdParamsSchema.parse(req.params);
    const result = await listSkillStandardMappings(
      skillId,
      listSkillStandardMappingsQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai pemetaan kemahiran dan standard berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function removeSkillStandardMappingController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { skillId, learningStandardId } = skillLearningStandardParamsSchema.parse(
      req.params,
    );
    await removeSkillStandardMapping(
      skillId,
      learningStandardId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Pemetaan kemahiran dan standard berjaya dibuang.", null);
  } catch (error) {
    next(error);
  }
}

export async function createLearningObjectiveController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { skillId } = skillIdParamsSchema.parse(req.params);
    const objective = await createLearningObjective(
      skillId,
      createLearningObjectiveSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Objektif pembelajaran berjaya diwujudkan.", {
      objective,
    });
  } catch (error) {
    next(error);
  }
}

export async function listLearningObjectivesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { skillId } = skillIdParamsSchema.parse(req.params);
    const result = await listLearningObjectives(
      skillId,
      listLearningObjectivesQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai objektif pembelajaran berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function getLearningObjectiveController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { objectiveId } = objectiveIdParamsSchema.parse(req.params);
    const result = await getLearningObjective(
      objectiveId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Maklumat objektif pembelajaran berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateLearningObjectiveController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { objectiveId } = objectiveIdParamsSchema.parse(req.params);
    const objective = await updateLearningObjective(
      objectiveId,
      updateLearningObjectiveSchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Objektif pembelajaran berjaya dikemas kini.", {
      objective,
    });
  } catch (error) {
    next(error);
  }
}

export async function createSuggestedTeachingActivityController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { skillId } = skillIdParamsSchema.parse(req.params);
    const activity = await createSuggestedTeachingActivity(
      skillId,
      createSuggestedTeachingActivitySchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Aktiviti pengajaran dicadangkan berjaya diwujudkan.", {
      activity,
    });
  } catch (error) {
    next(error);
  }
}

export async function listSuggestedTeachingActivitiesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { skillId } = skillIdParamsSchema.parse(req.params);
    const result = await listSuggestedTeachingActivities(
      skillId,
      listSuggestedTeachingActivitiesQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Senarai aktiviti pengajaran dicadangkan berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function getSuggestedTeachingActivityController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { activityId } = activityIdParamsSchema.parse(req.params);
    const result = await getSuggestedTeachingActivity(
      activityId,
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Maklumat aktiviti pengajaran dicadangkan berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateSuggestedTeachingActivityController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { activityId } = activityIdParamsSchema.parse(req.params);
    const activity = await updateSuggestedTeachingActivity(
      activityId,
      updateSuggestedTeachingActivitySchema.parse(req.body),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Aktiviti pengajaran dicadangkan berjaya dikemas kini.", {
      activity,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurriculumTreeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { programmeId } = programmeIdParamsSchema.parse(req.params);
    const result = await getCurriculumTree(
      programmeId,
      curriculumTreeQuerySchema.parse(req.query),
      curriculumAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Struktur kurikulum berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}
