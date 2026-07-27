import { UserRole } from "@prisma/client";
import { Router } from "express";

import {
  activateQuestionBankItemController,
  addQuestionBankAnswerOptionController,
  addQuestionBankCurriculumLinkController,
  addQuestionBankMediaController,
  archiveQuestionBankItemController,
  createQuestionBankItemController,
  duplicateCheckController,
  getQuestionBankItemController,
  listQuestionBankAnswerOptionsController,
  listQuestionBankCurriculumLinksController,
  listQuestionBankItemsController,
  listQuestionBankMediaController,
  removeQuestionBankAnswerOptionController,
  removeQuestionBankCurriculumLinkController,
  removeQuestionBankMediaController,
  reorderQuestionBankMediaController,
  reorderQuestionBankOptionsController,
  updateQuestionBankAnswerOptionController,
  updateQuestionBankItemController,
} from "../controllers/question-bank.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
const manage = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);
const read = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER);

router.use(authenticate, requirePasswordChanged);

router.post("/items", manage, createQuestionBankItemController);
router.get("/items", read, listQuestionBankItemsController);
router.get("/items/:itemId", read, getQuestionBankItemController);
router.patch("/items/:itemId", manage, updateQuestionBankItemController);
router.post("/items/:itemId/activate", manage, activateQuestionBankItemController);
router.post("/items/:itemId/archive", manage, archiveQuestionBankItemController);

router.post("/items/:itemId/curriculum-links", manage, addQuestionBankCurriculumLinkController);
router.get("/items/:itemId/curriculum-links", read, listQuestionBankCurriculumLinksController);
router.delete("/items/:itemId/curriculum-links/:linkId", manage, removeQuestionBankCurriculumLinkController);

router.post("/items/:itemId/options", manage, addQuestionBankAnswerOptionController);
router.get("/items/:itemId/options", read, listQuestionBankAnswerOptionsController);
router.patch("/items/:itemId/options/reorder", manage, reorderQuestionBankOptionsController);
router.patch("/items/:itemId/options/:optionId", manage, updateQuestionBankAnswerOptionController);
router.delete("/items/:itemId/options/:optionId", manage, removeQuestionBankAnswerOptionController);

router.post("/items/:itemId/media", manage, addQuestionBankMediaController);
router.get("/items/:itemId/media", read, listQuestionBankMediaController);
router.delete("/items/:itemId/media/:mediaLinkId", manage, removeQuestionBankMediaController);
router.patch("/items/:itemId/media/reorder", manage, reorderQuestionBankMediaController);

router.post("/duplicate-check", manage, duplicateCheckController);

export default router;
