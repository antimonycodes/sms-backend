import {
  ErrorResponse,
  PaginationInfo,
  PaginationInput,
  PaginationResult,
  SuccessResponse,
} from "@/types/common";
import { Response, NextFunction, Request } from "express";
import { ValidationError } from "express-validator";

// ====================================
// RESPONSE HANDLERS (utils/responses.ts)
// ====================================

/**
 * Send success response
 */
export const sendSuccess = <T = any>(
  res: Response,
  message: string,
  data: T | null = null,
  statusCode: number = 200,
  pagination: PaginationInfo | null = null
): Response<SuccessResponse<T>> => {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
  };

  // Only add data if it exists
  if (data !== null) {
    response.data = data;
  }

  // Add pagination info if provided
  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated success response (convenience function)
 */
export const sendPaginatedSuccess = <T = any>(
  res: Response,
  message: string,
  data: T,
  paginationInfo: PaginationInput
): Response<SuccessResponse<T>> => {
  const pagination: PaginationInfo = {
    currentPage: paginationInfo.currentPage,
    totalPages: paginationInfo.totalPages,
    totalItems: paginationInfo.totalItems,
    itemsPerPage: paginationInfo.itemsPerPage,
    hasNext: paginationInfo.currentPage < paginationInfo.totalPages,
    hasPrev: paginationInfo.currentPage > 1,
  };

  return sendSuccess(res, message, data, 200, pagination);
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
