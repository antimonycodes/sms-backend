import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { checkEmailExistsQuery } from "@/data/sqlQuery";
import { query } from "@/lib/db";
import {
  getStudentByAdmissionNumberQuery,
  // getStudentByAdmissionNumberQuery,
  getStudentByEmailQuery,
} from "@/data/admin.queries";
import { sendError } from "@/utils/sendResponse";

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

export const createStudentValidator = async (data: any, schoolId: string) => {
  const { admission_number, first_name, last_name, email, class_arm_id } = data;

  // required fields check
  // if (
  //   !admission_number ||
  //   !first_name ||
  //   !last_name ||
  //   !email ||
  //   class_arm_id
  // ) {
  //   return {
  //     valid: false,
  //     status: 400,
  //     message: "Missing required fields",
  //   };
  // }

  if (!admission_number) {
    return {
      valid: false,
      status: 400,
      message: "Admission number is required",
    };
  }

  if (!first_name) {
    return {
      valid: false,
      status: 400,
      message: "First name is required",
    };
  }

  if (!email) {
    return {
      valid: false,
      status: 400,
      message: "Email is required",
    };
  }
  if (!class_arm_id) {
    return {
      valid: false,
      status: 400,
      message: "Class is required",
    };
  }

  // check email uniqueness
  const emailExists = await query(getStudentByEmailQuery, [email, schoolId]);
  if ((emailExists.rowCount ?? 0) > 0) {
    return {
      valid: false,
      status: 409,
      message: "Email already exists",
    };
  }

  // check admission number uniqueness
  const admissionNumberExists = await query(getStudentByAdmissionNumberQuery, [
    admission_number,
    schoolId,
  ]);
  if ((admissionNumberExists.rowCount ?? 0) > 0) {
    return {
      valid: false,
      status: 409,
      message: "Admission number already exists",
    };
  }

  return { valid: true };
};

export const updateStudentValidator = async (data: any, schoolId: string) => {
  const { admission_number, first_name, last_name, email } = data;

  // required fields check
  if (!admission_number || !first_name || !last_name || !email) {
    return {
      valid: false,
      status: 400,
      message: "Missing required fields",
    };
  }

  // check email uniqueness
  const emailExists = await query(getStudentByEmailQuery, [email, schoolId]);
  if ((emailExists.rowCount ?? 0) > 0) {
    return {
      valid: false,
      status: 409,
      message: "Email already exists",
    };
  }

  // check admission number uniqueness
  const admissionNumberExists = await query(getStudentByAdmissionNumberQuery, [
    admission_number,
    schoolId,
  ]);
  if ((admissionNumberExists.rowCount ?? 0) > 0) {
    return {
      valid: false,
      status: 409,
      message: "Admission number already exists",
    };
  }

  return { valid: true };
};
