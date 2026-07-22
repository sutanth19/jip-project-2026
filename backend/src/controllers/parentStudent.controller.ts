import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { successResponse } from "../helpers/response.helper.js";

import {
  createParentStudent,
  getStudentsByParent,
  getParentsByStudent,
  updateParentStudent,
  deleteParentStudent,
} from "../services/parentStudent.service.js";

import { createParentStudentSchema,
         updateParentStudentSchema,
 } from "../validators/parentStudent.validator.js";

export async function createParentStudentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = createParentStudentSchema.parse(req.body);

    const relationship = await createParentStudent(data);

    return successResponse(
      res,
      201,
      "Parent linked to student successfully.",
      relationship
    );
  } catch (error) {
    next(error);
  }
}

export async function getStudentsByParentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const students = await getStudentsByParent(
      req.params.id as string
    );

    return successResponse(
      res,
      200,
      "Children retrieved successfully.",
      students
    );
  } catch (error) {
    next(error);
  }
}

export async function getParentsByStudentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parents = await getParentsByStudent(
      req.params.id as string
    );
    //return data fr db
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

export async function updateParentStudentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = updateParentStudentSchema.parse(req.body);

    const relationship = await updateParentStudent(
      req.params.id as string,
      data
    );

    return successResponse(
      res,
      200,
      "Relationship updated successfully.",
      relationship
    );
  } catch (error) {
    next(error);
  }
}

export async function deleteParentStudentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await deleteParentStudent(req.params.id as string);

    return successResponse(
      res,
      200,
      "Relationship removed successfully.",
      null
    );
  } catch (error) {
    next(error);
  }
}