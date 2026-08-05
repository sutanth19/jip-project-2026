import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { AppError } from "../errors/app-error.js";

import {
  changeFirstPin,
  changeFirstPassword,
  login,
  requestPasswordReset,
  resetPassword,
  setupPassword,
  studentLogin,
} from "../services/auth.service.js";

import {
  changeFirstPinSchema,
  changeFirstPasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  setupPasswordSchema,
  studentLoginSchema,
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
      "Log masuk berjaya.",
      result
    );
  } catch (error) {
    if (error instanceof ZodError) {
      next(
        new AppError(
          "AUTH_INVALID_INPUT",
          400,
          "Sila semak maklumat log masuk anda."
        )
      );
      return;
    }

    next(error);
  }
}

export async function studentLoginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = studentLoginSchema.parse(req.body);
    const result = await studentLogin(data);

    return successResponse(
      res,
      200,
      "Log masuk murid berjaya.",
      result
    );
  } catch (error) {
    if (error instanceof ZodError) {
      next(
        new AppError(
          "AUTH_INVALID_INPUT",
          400,
          "Sila semak maklumat log masuk murid anda."
        )
      );
      return;
    }

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
    if (error instanceof ZodError) {
      next(
        new AppError(
          "AUTH_INVALID_INPUT",
          400,
          "Sila semak maklumat yang diberikan."
        )
      );
      return;
    }

    next(error);
  }
}

export async function forgotPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await requestPasswordReset(data);

    return successResponse(
      res,
      200,
      result.message
    );
  } catch (error) {
    if (error instanceof ZodError) {
      next(
        new AppError(
          "AUTH_INVALID_INPUT",
          400,
          "Sila masukkan alamat e-mel yang sah."
        )
      );
      return;
    }

    next(error);
  }
}

export async function resetPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(data);

    return successResponse(
      res,
      200,
      result.message
    );
  } catch (error) {
    if (error instanceof ZodError) {
      next(
        new AppError(
          "AUTH_INVALID_INPUT",
          400,
          "Sila semak maklumat tetapan semula kata laluan anda."
        )
      );
      return;
    }

    next(error);
  }
}

export async function changeFirstPasswordController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = changeFirstPasswordSchema.parse(req.body);
    const auth = req.auth ?? req.user;

    if (!auth) {
      next(
        new AppError(
          "AUTH_INVALID_TOKEN",
          401,
          "Invalid or expired token."
        )
      );
      return;
    }

    const result = await changeFirstPassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      confirmPassword: data.confirmPassword,
      auth,
    });

    return successResponse(
      res,
      200,
      "Kata laluan berjaya dikemas kini.",
      result
    );
  } catch (error) {
    if (error instanceof ZodError) {
      next(
        new AppError(
          "AUTH_INVALID_INPUT",
          400,
          "Sila semak maklumat penukaran kata laluan anda."
        )
      );
      return;
    }

    next(error);
  }
}

export async function changeFirstPinController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = changeFirstPinSchema.parse(req.body);
    const auth = req.auth ?? req.user;

    if (!auth) {
      next(
        new AppError(
          "AUTH_INVALID_TOKEN",
          401,
          "Invalid or expired token."
        )
      );
      return;
    }

    const result = await changeFirstPin({
      currentPin: data.currentPin,
      newPin: data.newPin,
      confirmPin: data.confirmPin,
      auth,
    });

    return successResponse(
      res,
      200,
      "PIN berjaya dikemas kini.",
      result
    );
  } catch (error) {
    if (error instanceof ZodError) {
      next(
        new AppError(
          "AUTH_INVALID_INPUT",
          400,
          "Sila semak maklumat penukaran PIN anda."
        )
      );
      return;
    }

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
