import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

import {
  login,
  setupPassword,
} from "../services/auth.service.js";

import {
  loginSchema,
  setupPasswordSchema,
} from "../validators/auth.validator.js";

import { successResponse } from "../helpers/response.helper.js";

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = loginSchema.parse(req.body);

    const result = await login(data);

    return successResponse(
      res,
      200,
      "Login successful.",
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function setupPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = setupPasswordSchema.parse(req.body);

    const { token, password } = data;

    await setupPassword({
      token,
      password,
    });

    return successResponse(
      res,
      200,
      "Password has been set successfully."
    );
  } catch (error) {
    next(error);
  }
}

export async function meController(
  req: AuthenticatedRequest,
  res: Response
) {
  return successResponse(
    res,
    200,
    "User profile retrieved successfully.",
    req.user
  );
}