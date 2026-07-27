import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  activateQuestionBankItem,
  addQuestionBankAnswerOption,
  addQuestionBankCurriculumLink,
  addQuestionBankMedia,
  archiveQuestionBankItem,
  checkQuestionBankDuplicates,
  createQuestionBankItem,
  getQuestionBankItem,
  listQuestionBankAnswerOptions,
  listQuestionBankCurriculumLinks,
  listQuestionBankItems,
  listQuestionBankMedia,
  removeQuestionBankAnswerOption,
  removeQuestionBankCurriculumLink,
  removeQuestionBankMedia,
  reorderQuestionBankMedia,
  reorderQuestionBankOptions,
  updateQuestionBankAnswerOption,
  updateQuestionBankItem,
  type QuestionBankAuditContext,
} from "../services/question-bank.service.js";
import {
  createAnswerOptionSchema,
  createCurriculumLinkSchema,
  createQuestionBankItemSchema,
  createQuestionBankMediaSchema,
  curriculumLinkParamsSchema,
  duplicateCheckSchema,
  listQuestionBankItemsQuerySchema,
  mediaParamsSchema,
  optionParamsSchema,
  questionBankItemIdParamsSchema,
  questionBankStatusTransitionSchema,
  reorderMediaSchema,
  reorderOptionsSchema,
  updateAnswerOptionSchema,
  updateQuestionBankItemSchema,
} from "../validators/question-bank.validator.js";

function auditContext(req: AuthenticatedRequest): QuestionBankAuditContext {
  if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  return { actor: req.auth, requestIp: req.ip ?? null, userAgent: req.get("user-agent") ?? null };
}

async function respond(
  res: Response,
  next: NextFunction,
  status: number,
  message: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  try {
    successResponse(res, status, message, await operation());
  } catch (error) {
    next(error);
  }
}

export function createQuestionBankItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 201, "Item bank soalan berjaya diwujudkan.", async () => ({ item: await createQuestionBankItem(createQuestionBankItemSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) }));
}

export function listQuestionBankItemsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Senarai item bank soalan berjaya diperoleh.", () => listQuestionBankItems(listQuestionBankItemsQuerySchema.parse(req.query), auditContext(req as AuthenticatedRequest)));
}

export function getQuestionBankItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Item bank soalan berjaya diperoleh.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    return { item: await getQuestionBankItem(itemId, auditContext(req as AuthenticatedRequest)) };
  });
}

export function updateQuestionBankItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Item bank soalan berjaya dikemas kini.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    return { item: await updateQuestionBankItem(itemId, updateQuestionBankItemSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) };
  });
}

export function activateQuestionBankItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Item bank soalan berjaya diaktifkan.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    const { allowDuplicateOverride } = questionBankStatusTransitionSchema.parse(req.body ?? {});
    return { item: await activateQuestionBankItem(itemId, auditContext(req as AuthenticatedRequest), allowDuplicateOverride) };
  });
}

export function archiveQuestionBankItemController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Item bank soalan berjaya diarkibkan.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    questionBankStatusTransitionSchema.parse(req.body ?? {});
    return { item: await archiveQuestionBankItem(itemId, auditContext(req as AuthenticatedRequest)) };
  });
}

export function duplicateCheckController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Semakan pendua berjaya dilakukan.", () => checkQuestionBankDuplicates(duplicateCheckSchema.parse(req.body), auditContext(req as AuthenticatedRequest)));
}

export function addQuestionBankCurriculumLinkController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 201, "Pautan kurikulum berjaya ditambah.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    return { link: await addQuestionBankCurriculumLink(itemId, createCurriculumLinkSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) };
  });
}

export function listQuestionBankCurriculumLinksController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Pautan kurikulum berjaya diperoleh.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    return { links: await listQuestionBankCurriculumLinks(itemId, auditContext(req as AuthenticatedRequest)) };
  });
}

export function removeQuestionBankCurriculumLinkController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Pautan kurikulum berjaya dibuang.", async () => {
    const { itemId, linkId } = curriculumLinkParamsSchema.parse(req.params);
    await removeQuestionBankCurriculumLink(itemId, linkId, auditContext(req as AuthenticatedRequest));
    return { linkId };
  });
}

export function addQuestionBankAnswerOptionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 201, "Pilihan jawapan berjaya ditambah.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    return { option: await addQuestionBankAnswerOption(itemId, createAnswerOptionSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) };
  });
}

export function listQuestionBankAnswerOptionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Pilihan jawapan berjaya diperoleh.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    return { options: await listQuestionBankAnswerOptions(itemId, auditContext(req as AuthenticatedRequest)) };
  });
}

export function updateQuestionBankAnswerOptionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Pilihan jawapan berjaya dikemas kini.", async () => {
    const { itemId, optionId } = optionParamsSchema.parse(req.params);
    return { option: await updateQuestionBankAnswerOption(itemId, optionId, updateAnswerOptionSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) };
  });
}

export function removeQuestionBankAnswerOptionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Pilihan jawapan berjaya dibuang.", async () => {
    const { itemId, optionId } = optionParamsSchema.parse(req.params);
    await removeQuestionBankAnswerOption(itemId, optionId, auditContext(req as AuthenticatedRequest));
    return { optionId };
  });
}

export function reorderQuestionBankOptionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Turutan pilihan jawapan berjaya dikemas kini.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    const { optionIds } = reorderOptionsSchema.parse(req.body);
    await reorderQuestionBankOptions(itemId, optionIds, auditContext(req as AuthenticatedRequest));
    return { optionIds };
  });
}

export function addQuestionBankMediaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 201, "Pautan media berjaya ditambah.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    return { media: await addQuestionBankMedia(itemId, createQuestionBankMediaSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) };
  });
}

export function listQuestionBankMediaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Pautan media berjaya diperoleh.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    return { media: await listQuestionBankMedia(itemId, auditContext(req as AuthenticatedRequest)) };
  });
}

export function removeQuestionBankMediaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Pautan media berjaya dibuang.", async () => {
    const { itemId, mediaLinkId } = mediaParamsSchema.parse(req.params);
    await removeQuestionBankMedia(itemId, mediaLinkId, auditContext(req as AuthenticatedRequest));
    return { mediaLinkId };
  });
}

export function reorderQuestionBankMediaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Turutan media berjaya dikemas kini.", async () => {
    const { itemId } = questionBankItemIdParamsSchema.parse(req.params);
    const { mediaLinkIds } = reorderMediaSchema.parse(req.body);
    await reorderQuestionBankMedia(itemId, mediaLinkIds, auditContext(req as AuthenticatedRequest));
    return { mediaLinkIds };
  });
}
