import type { Request, Response, NextFunction } from "express";
import { createSchool } from "../services/school.service.js";
import { createSchoolSchema } from "../validators/school.validator.js";
import { successResponse } from "../helpers/response.helper.js";

export async function createSchoolController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = createSchoolSchema.parse(req.body);
    const result = await createSchool(data);

    return successResponse(
      res,
      201,
      "School created successfully.",
      result
    );
  } catch (error) {
    next(error);
  }
}