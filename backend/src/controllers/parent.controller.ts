import type { Request, Response, NextFunction } from "express";
import {
  createParent,
  getParents,
  getParentById,
  updateParent,
  updateParentStatus,
  resendParentSetupLink,
} from "../services/parent.service.js";
import { createParentSchema } from "../validators/parent.validator.js";
import { successResponse } from "../helpers/response.helper.js";

export async function createParentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
   const data = createParentSchema.parse(req.body);

   const result = await createParent(data);

  return successResponse(
    res,
    201,
    "Parent created successfully.",
    result
  );
  } catch (error) {
    next(error);
  }
}

export async function getParentsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parents = await getParents();

  return successResponse(
    res,
    200,
    "Parents retrieved successfully.",
    parents
  );
  } catch (error) {
    next(error);
  }
}

export async function getParentByIdController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parent = await getParentById(
      req.params.id as string
    );

    return successResponse(
      res,
      200,
      "Parent retrieved successfully.",
      parent
    );
  } catch (error) {
    next(error);
  }
}

export async function updateParentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parent = await updateParent(
      req.params.id as string,
      req.body
    );

    return successResponse(
      res,
      200,
      "Parent updated successfully.",
      parent
    );
  } catch (error) {
    next(error);
  }
}

export async function updateParentStatusController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parent = await updateParentStatus(
      req.params.id as string,
      req.body
    );

    return successResponse(
      res,
      200,
      "Parent status updated successfully.",
      parent
    );
  } catch (error) {
    next(error);
  }
}

export async function resendParentSetupLinkController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await resendParentSetupLink(
      req.params.id as string
    );

    return successResponse(
        res,
        200,
        "Setup link regenerated successfully.",
        result
    );
  } catch (error) {
    next(error);
  }
}