import { Response } from "express";

// Success response (when everything goes well)
export const sendSuccess = (res: Response, message: string, data?: any) => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

// Error response (when something goes wrong)
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400
) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
