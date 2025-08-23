import { body, validationResult } from "express-validator";
import { sendError } from "../utils/responses";
import { Request, Response, NextFunction } from "express";
import { checkEmailExistsQuery } from "@/data/sqlQuery";
import { query } from "@/lib/db";

// Validation middleware
export const schoolSignupValidation = [
  body("name").notEmpty().withMessage("School name is required"),
  body("address").notEmpty().withMessage("Address is required"),
  body("phone").notEmpty().withMessage("Phone number is required"),
  body("email")
    .trim()
    .notEmpty()
    .isEmail()
    .isLength({ max: 50 })
    .withMessage("Invalid email format")
    .custom(async (value) => {
      const emailCheck = await query(checkEmailExistsQuery, [value]);
      if (emailCheck.rows.length > 0) {
        throw new Error("User already exists");
      }
    }),
  body("logo_url").isURL().withMessage("Invalid logo format"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  // Middleware to handle validation result
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // join all error messages into a single string
      const errorMessage = errors
        .array()
        .map((err) => err.msg)
        .join("; ");

      return sendError(res, errorMessage, 422);
    }
    next();
  },
];
