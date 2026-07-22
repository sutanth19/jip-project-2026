import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  updateStudentStatus,
  resetStudentPin,
} from "../services/student.service.js";
import {
  createStudentSchema,
  updateStudentSchema,
  updateStatusSchema,
} from "../validators/student.validator.js";
import { successResponse } from "../helpers/response.helper.js";

export async function createStudentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = createStudentSchema.parse(req.body);

    const result = await createStudent(data);

    return successResponse(
      res,
      201,
      "Student created successfully.",
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function getStudentsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const students = await getStudents();

    return successResponse(
      res,
      200,
      "Students retrieved successfully.",
      students
    );
  } catch (error) {
    next(error);
  }
}

export async function getStudentByIdController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const student = await getStudentById(
      req.params.id as string
    );

    return successResponse(
      res,
      200,
      "Student retrieved successfully.",
      student
    );
  } catch (error) {
    next(error);
  }
}

export async function updateStudentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = updateStudentSchema.parse(req.body);

    const student = await updateStudent(
      req.params.id as string,
      data
    );

    return successResponse(
      res,
      200,
      "Student updated successfully.",
      student
    );
  } catch (error) {
    next(error);
  }
}

export async function updateStudentStatusController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = updateStatusSchema.parse(req.body);

    const student = await updateStudentStatus(
      req.params.id as string,
      data
    );

    return successResponse(
      res,
      200,
      "Student status updated successfully.",
      student
    );
  } catch (error) {
    next(error);
  }
}

export async function resetStudentPinController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await resetStudentPin(
      req.params.id as string
    );

    return successResponse(
      res,
      200,
      "Student PIN reset successfully.",
      result
    );
  } catch (error) {
    next(error);
  }
}