import { query } from "@/lib/db";
import { logger } from "@/lib/winston";
import { AuthenticatedRequest } from "@/middlewares/auth";
import {
  ErrorResponse,
  PaginationInfo,
  PaginationInput,
  PaginationResult,
  SuccessResponse,
} from "@/types/common";
import { Response, NextFunction, Request } from "express";
import { ValidationError } from "express-validator";

interface School {
  id: number;
  name: string;
  location: string;
  // ...other columns
}

// export async function withSchool<T>(
//   data: T
// ): Promise<T & { school: School | null }> {
//   const result = await query("SELECT * FROM schools LIMIT 1");

//   // Safely pick first row
//   const school: School | null =
//     result.rows.length > 0 ? (result.rows[0] as School) : null;

//   return {
//     ...data,
//     school,
//   };
// }

// ✅ helper: always attach school
export async function withSchool<T>(
  data: T,
  schoolId?: string,
  keyName: string = "data"
): Promise<Record<string, any>> {
  let school: School | null = null;

  try {
    if (schoolId) {
      const result = await query("SELECT * FROM schools WHERE id = $1", [
        schoolId,
      ]);
      if (result.rows.length > 0) school = result.rows[0] as School;
    } else {
      const result = await query("SELECT * FROM schools LIMIT 1");
      if (result.rows.length > 0) school = result.rows[0] as School;
    }
  } catch (err) {
    console.error("Error fetching school:", err);
  }

  return {
    [keyName]: data, // dynamic key here
    school,
  };
}

// success response
export const sendSuccess = async <T = any>(
  req: AuthenticatedRequest,
  res: Response,
  message: string,
  data: T | null = null,
  pagination: PaginationInfo | null = null,
  keyName: string = "items" // fallback key
): Promise<Response> => {
  let schoolId =
    req.user?.schoolId || req.query.school_id || req.params.school_id;
  if (typeof schoolId === "number") {
    schoolId = schoolId.toString();
  }

  const dataWithSchool = await withSchool(
    data ?? {},
    schoolId as string | undefined,
    keyName
  );

  const response: SuccessResponse<typeof dataWithSchool> = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data: dataWithSchool,
    pagination: pagination ?? undefined,
  };

  return res.status(200).json(response);
};

export const sendPaginatedSuccess = async <T = any>(
  req: AuthenticatedRequest,
  res: Response,
  message: string,
  data: T,
  paginationInfo: PaginationInput,
  keyName: string = "items"
): Promise<Response> => {
  const pagination: PaginationInfo = {
    currentPage: paginationInfo.currentPage,
    totalPages: paginationInfo.totalPages,
    totalItems: paginationInfo.totalItems,
    itemsPerPage: paginationInfo.itemsPerPage,
    hasNext: paginationInfo.currentPage < paginationInfo.totalPages,
    hasPrev: paginationInfo.currentPage > 1,
  };

  return sendSuccess(req, res, message, data, pagination, keyName);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  errors: any = null
): Response<ErrorResponse> => {
  const response: ErrorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  // Add errors if provided
  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// Specific error response helpers
export const sendValidationError = (
  res: Response,
  errors: ValidationError[]
): Response<ErrorResponse> => {
  return sendError(res, "Validation failed", 422, errors);
};

export const sendNotFound = (
  res: Response,
  resource: string = "Resource"
): Response<ErrorResponse> => {
  return sendError(res, `${resource} not found`, 404);
};

export const sendUnauthorized = (
  res: Response,
  message: string = "Authentication required"
): Response<ErrorResponse> => {
  return sendError(res, message, 401);
};

export const sendForbidden = (
  res: Response,
  message: string = "Access denied"
): Response<ErrorResponse> => {
  return sendError(res, message, 403);
};

export const sendServerError = (
  res: Response,
  message: string = "Internal server error"
): Response<ErrorResponse> => {
  return sendError(res, message, 500);
};

// ====================================
// PAGINATION UTILITIES (utils/pagination.ts)
// ====================================

/**
 * Calculate pagination details
 */
export const calculatePagination = (
  page: number = 1,
  limit: number = 10,
  totalItems: number = 0
): PaginationResult => {
  const currentPage = Math.max(1, parseInt(page.toString()));
  const itemsPerPage = Math.min(100, Math.max(1, parseInt(limit.toString()))); // Max 100 items per page
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    offset,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};

/**
 * Create pagination info for response
 */
export const createPaginationResponse = (
  page: number,
  limit: number,
  totalItems: number
): PaginationInfo => {
  const pagination = calculatePagination(page, limit, totalItems);

  return {
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    totalItems: pagination.totalItems,
    itemsPerPage: pagination.itemsPerPage,
    hasNext: pagination.hasNext,
    hasPrev: pagination.hasPrev,
  };
};

// ====================================
// ASYNC ERROR WRAPPER (utils/asyncHandler.ts)
// ====================================

// import { Request, Response, NextFunction } from "express";

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wraps async functions to catch errors automatically
 */
export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
