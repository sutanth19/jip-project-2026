import type { Request, Response, NextFunction } from "express";
import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  updateTeacherStatus,
  resendTeacherSetupLink,
} from "../services/teacher.service.js";
import { createTeacherSchema } from "../validators/teacher.validator.js";
import { successResponse } from "../helpers/response.helper.js";

export async function createTeacherController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
   const data = createTeacherSchema.parse(req.body);
   const result = await createTeacher(data);

    return successResponse(
      res,
      201,
      "Teacher created successfully.",
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function getTeachersController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const teachers = await getTeachers();

    return res.status(200).json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherByIdController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const teacher = await getTeacherById(req.params.id as string);

    return res.status(200).json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTeacherController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const teacher = await updateTeacher(
      req.params.id as string,
      req.body
    );

    return successResponse(
      res,
      200,
      "Teacher updated successfully.",
      teacher
    );
  } catch (error) {
    next(error);
  }
}

export async function updateTeacherStatusController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const teacher = await updateTeacherStatus(
      req.params.id as string,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Teacher status updated successfully.",
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
}

export async function resendTeacherSetupLinkController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await resendTeacherSetupLink(
      req.params.id as string
    );

    return res.status(200).json({
      success: true,
      message: "Setup link regenerated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}