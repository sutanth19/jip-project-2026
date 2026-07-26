import { UserRole } from "@prisma/client";
import { Router } from "express";

import {
  archiveCurriculumVersionController,
  createContentStandardController,
  createCurriculumVersionController,
  createCurriculumYearController,
  createLanguageStructureController,
  createLearningObjectiveController,
  createLearningStandardController,
  createProgrammeController,
  createRemedialSkillController,
  createSkillStandardMappingController,
  createSubjectController,
  createSuggestedTeachingActivityController,
  getContentStandardController,
  getCurriculumTreeController,
  getCurriculumVersionController,
  getLearningObjectiveController,
  getLearningStandardController,
  getProgrammeController,
  getRemedialSkillController,
  getSubjectController,
  getSuggestedTeachingActivityController,
  listContentStandardsController,
  listCurriculumVersionsController,
  listCurriculumYearsController,
  listLanguageStructuresController,
  listLearningObjectivesController,
  listLearningStandardsController,
  listProgrammesController,
  listRemedialSkillsController,
  listSkillStandardMappingsController,
  listSubjectsController,
  listSuggestedTeachingActivitiesController,
  publishCurriculumVersionController,
  removeSkillStandardMappingController,
  updateContentStandardController,
  updateCurriculumVersionController,
  updateCurriculumYearController,
  updateLanguageStructureController,
  updateLearningObjectiveController,
  updateLearningStandardController,
  updateProgrammeController,
  updateRemedialSkillController,
  updateSubjectController,
  updateSuggestedTeachingActivityController,
} from "../controllers/curriculum.controller.js";
import {
  authenticate,
  requirePasswordChanged,
} from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

const requireCurriculumRead = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.TEACHER,
);
const requireCurriculumManagement = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
);
const requireCurriculumVersionControl = requireRole(UserRole.SUPER_ADMIN);

router.use(authenticate, requirePasswordChanged);

router.post(
  "/versions",
  requireCurriculumManagement,
  createCurriculumVersionController,
);
router.get(
  "/versions",
  requireCurriculumRead,
  listCurriculumVersionsController,
);
router.get(
  "/versions/:versionId",
  requireCurriculumRead,
  getCurriculumVersionController,
);
router.patch(
  "/versions/:versionId",
  requireCurriculumManagement,
  updateCurriculumVersionController,
);
router.post(
  "/versions/:versionId/publish",
  requireCurriculumVersionControl,
  publishCurriculumVersionController,
);
router.post(
  "/versions/:versionId/archive",
  requireCurriculumVersionControl,
  archiveCurriculumVersionController,
);

router.post("/subjects", requireCurriculumManagement, createSubjectController);
router.get("/subjects", requireCurriculumRead, listSubjectsController);
router.get("/subjects/:subjectId", requireCurriculumRead, getSubjectController);
router.patch(
  "/subjects/:subjectId",
  requireCurriculumManagement,
  updateSubjectController,
);

router.post("/programmes", requireCurriculumManagement, createProgrammeController);
router.get("/programmes", requireCurriculumRead, listProgrammesController);
router.get(
  "/programmes/:programmeId/tree",
  requireCurriculumRead,
  getCurriculumTreeController,
);
router.post(
  "/programmes/:programmeId/years",
  requireCurriculumManagement,
  createCurriculumYearController,
);
router.get(
  "/programmes/:programmeId/years",
  requireCurriculumRead,
  listCurriculumYearsController,
);
router.post(
  "/programmes/:programmeId/language-structures",
  requireCurriculumManagement,
  createLanguageStructureController,
);
router.get(
  "/programmes/:programmeId/language-structures",
  requireCurriculumRead,
  listLanguageStructuresController,
);
router.post(
  "/programmes/:programmeId/remedial-skills",
  requireCurriculumManagement,
  createRemedialSkillController,
);
router.get(
  "/programmes/:programmeId/remedial-skills",
  requireCurriculumRead,
  listRemedialSkillsController,
);
router.post(
  "/programmes/:programmeId/content-standards",
  requireCurriculumManagement,
  createContentStandardController,
);
router.get(
  "/programmes/:programmeId/content-standards",
  requireCurriculumRead,
  listContentStandardsController,
);
router.get(
  "/programmes/:programmeId",
  requireCurriculumRead,
  getProgrammeController,
);
router.patch(
  "/programmes/:programmeId",
  requireCurriculumManagement,
  updateProgrammeController,
);

router.patch(
  "/years/:yearId",
  requireCurriculumManagement,
  updateCurriculumYearController,
);
router.patch(
  "/language-structures/:structureId",
  requireCurriculumManagement,
  updateLanguageStructureController,
);

router.get(
  "/remedial-skills/:skillId/learning-standards",
  requireCurriculumRead,
  listSkillStandardMappingsController,
);
router.post(
  "/remedial-skills/:skillId/learning-standards/:learningStandardId",
  requireCurriculumManagement,
  createSkillStandardMappingController,
);
router.delete(
  "/remedial-skills/:skillId/learning-standards/:learningStandardId",
  requireCurriculumManagement,
  removeSkillStandardMappingController,
);
router.post(
  "/remedial-skills/:skillId/objectives",
  requireCurriculumManagement,
  createLearningObjectiveController,
);
router.get(
  "/remedial-skills/:skillId/objectives",
  requireCurriculumRead,
  listLearningObjectivesController,
);
router.post(
  "/remedial-skills/:skillId/suggested-activities",
  requireCurriculumManagement,
  createSuggestedTeachingActivityController,
);
router.get(
  "/remedial-skills/:skillId/suggested-activities",
  requireCurriculumRead,
  listSuggestedTeachingActivitiesController,
);
router.get(
  "/remedial-skills/:skillId",
  requireCurriculumRead,
  getRemedialSkillController,
);
router.patch(
  "/remedial-skills/:skillId",
  requireCurriculumManagement,
  updateRemedialSkillController,
);

router.post(
  "/content-standards/:contentStandardId/learning-standards",
  requireCurriculumManagement,
  createLearningStandardController,
);
router.get(
  "/content-standards/:contentStandardId/learning-standards",
  requireCurriculumRead,
  listLearningStandardsController,
);
router.get(
  "/content-standards/:contentStandardId",
  requireCurriculumRead,
  getContentStandardController,
);
router.patch(
  "/content-standards/:contentStandardId",
  requireCurriculumManagement,
  updateContentStandardController,
);

router.get(
  "/learning-standards/:learningStandardId",
  requireCurriculumRead,
  getLearningStandardController,
);
router.patch(
  "/learning-standards/:learningStandardId",
  requireCurriculumManagement,
  updateLearningStandardController,
);

router.get(
  "/objectives/:objectiveId",
  requireCurriculumRead,
  getLearningObjectiveController,
);
router.patch(
  "/objectives/:objectiveId",
  requireCurriculumManagement,
  updateLearningObjectiveController,
);

router.get(
  "/suggested-activities/:activityId",
  requireCurriculumRead,
  getSuggestedTeachingActivityController,
);
router.patch(
  "/suggested-activities/:activityId",
  requireCurriculumManagement,
  updateSuggestedTeachingActivityController,
);

export default router;
