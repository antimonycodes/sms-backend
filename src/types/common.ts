export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
  timestamp: string;
}
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface PaginationInput {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}
export interface SuccessResponse<T = any> {
  success: true;
  message: string;
  data?: any;
  pagination?: PaginationInfo;
  timestamp: string;
  school?: School | null;
}

export interface School {
  id: number;
  name: string;
  address?: string;
  // add other fields here
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  totalItems?: number;
}

export interface PaginationResult {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
  hasNext: boolean;
  hasPrev: boolean;
}
