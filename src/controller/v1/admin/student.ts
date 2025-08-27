import {
  createStudentQuery,
  deleteStudentQuery,
  getStudentByIdQuery,
  getStudentByEmailQuery,
  updateStudentQuery,
} from "@/data/admin.queries";
import { query } from "@/lib/db";
import { AuthenticatedRequest } from "@/middlewares/auth";
import {
  createStudentValidator,
  updateStudentValidator,
} from "@/middlewares/validateRequest";
import { asyncHandler, sendError, sendSuccess } from "@/utils/sendResponse";
import { Response } from "express";

// CREATE STUDENT
export const createStudentService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;

    if (!schoolId) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    const validation = await createStudentValidator(req.body, String(schoolId));

    if (!validation.valid) {
      return res.status(validation.status ?? 400).json({
        status: "error",
        message: validation.message,
      });
    }

    const {
      admission_number,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      state_of_origin,
      lga,
      nationality,
      religion,
      guardian_name,
      guardian_phone,
      guardian_email,
      guardian_address,
      guardian_relationship,
      admission_date,
      passport_url,
      is_active,
    } = req.body;

    const result = await query(createStudentQuery, [
      schoolId,
      admission_number,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      state_of_origin,
      lga,
      nationality,
      religion,
      guardian_name,
      guardian_phone,
      guardian_email,
      guardian_address,
      guardian_relationship,
      admission_date,
      passport_url,
      is_active,
    ]);

    sendSuccess(
      req,
      res,
      "Student created successfully",
      result.rows[0],
      null,
      "student"
    );
  }
);

// GET ALL STUDENTS
export const getAllStudentsService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;

    if (!schoolId) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    const result = await query("SELECT * FROM students WHERE school_id = $1", [
      schoolId,
    ]);

    sendSuccess(
      req,
      res,
      "Students retrieved successfully",
      result.rows,
      null,
      "students"
    );
  }
);

// GET SINGLE STUDENT
export const getSingleStudentService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const { studentId } = req.params;

    if (!schoolId) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    if (!studentId) {
      return res.status(400).json({
        status: "error",
        message: "Student ID is required",
      });
    }

    const result = await query(getStudentByIdQuery, [studentId, schoolId]);

    if (result.rowCount === 0) {
      return sendError(res, "Student not found", 404);
    }

    sendSuccess(
      req,
      res,
      "Student retrieved successfully",
      result.rows[0],
      null,
      "student"
    );
  }
);

//UPDATE STUDENT INFO

export const updateStudentService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const { studentId } = req.params;
    const updates = req.body;

    if (!schoolId) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    if (!studentId) {
      return res.status(400).json({
        status: "error",
        message: "Student ID is required",
      });
    }

    // If body is empty
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields provided for update",
      });
    }

    // Build SET clause dynamically
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const setClause = fields
      .map((field, idx) => `${field} = $${idx + 2}`)
      .join(", ");

    const sql = `
      UPDATE students
      SET ${setClause}
      WHERE id = $1 AND school_id = $${fields.length + 2}
      RETURNING *;
    `;

    const result = await query(sql, [studentId, ...values, schoolId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Student not found or does not belong to this school",
      });
    }

    sendSuccess(
      req,
      res,
      "Student updated successfully",
      result.rows[0],
      null,
      "student"
    );
  }
);

// DELETE STUDENT
export const deleteStudentService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const { studentId } = req.params;

    if (!schoolId) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    if (!studentId) {
      return res.status(400).json({
        status: "error",
        message: "Student ID is required",
      });
    }

    // Check if student exists
    const existingStudent = await query(
      "SELECT * FROM students WHERE id = $1 AND school_id = $2",
      [studentId, schoolId]
    );

    if (existingStudent.rowCount === 0) {
      return sendError(res, "Student not found", 404);
    }

    const result = await query(deleteStudentQuery, [studentId, schoolId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Student not found",
      });
    }

    sendSuccess(req, res, "Student deleted successfully", result.rows[0]);
  }
);
