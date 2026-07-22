import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { successResponse } from "../helpers/response.helper.js";

import {
  createSchoolClass,
  getSchoolClasses,
  getSchoolClassById,
  updateSchoolClass,
  updateSchoolClassStatus,
} from "../services/schoolClass.service.js";

import {
  createSchoolClassSchema,
  updateSchoolClassSchema,
  updateSchoolClassStatusSchema,
} from "../validators/schoolClass.validator.js";

export async function createSchoolClassController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data =
      createSchoolClassSchema.parse(req.body);

    const result =
      await createSchoolClass(data);

    return successResponse(
      res,
      201,
      "Class created successfully.",
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function getSchoolClassesController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const classes = await getSchoolClasses();

    return successResponse(
      res,
      200,
      "Classes retrieved successfully.",
      classes
    );
  } catch (error) {
    next(error);
  }
}

export async function getSchoolClassByIdController(

  req: Request,

  res: Response,

  next: NextFunction

) {

  try {

    const schoolClass = await getSchoolClassById(

      req.params.id as string

    );

    return successResponse(

      res,

      200,

      "Class retrieved successfully.",

      schoolClass

    );

  } catch (error) {

    next(error);

  }

}

export async function updateSchoolClassController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = updateSchoolClassSchema.parse(req.body);

    const schoolClass = await updateSchoolClass(
      req.params.id as string,
      data
    );

    return successResponse(
      res,
      200,
      "Class updated successfully.",
      schoolClass
    );
  } catch (error) {
    next(error);
  }
}

export async function updateSchoolClassStatusController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = updateSchoolClassStatusSchema.parse(req.body);
    // If you created a dedicated schema instead:
    // const data = updateSchoolClassStatusSchema.parse(req.body);

    const schoolClass = await updateSchoolClassStatus(
      req.params.id as string,
      data
    );

    return successResponse(
      res,
      200,
      "Class status updated successfully.",
      schoolClass
    );
  } catch (error) {
    next(error);
  }
}