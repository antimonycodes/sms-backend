import {
  createStudentQuery,
  deleteStudentQuery,
  getStudentByIdQuery,
  getStudentByEmailQuery,
  updateStudentQuery,
  getAllStudentsQuery,
} from "@/data/admin.queries";
import { query, withTransaction } from "@/lib/db";
import { AuthenticatedRequest } from "@/middlewares/auth";
import {
  createStudentValidator,
  updateStudentValidator,
} from "@/middlewares/validateRequest";
import { asyncHandler, sendError, sendSuccess } from "@/utils/sendResponse";
import { Response } from "express";
import bcrypt from "bcryptjs";
import { createUserQuery } from "@/data/sqlQuery";
import { createEnrollmentQuery } from "@/data/queries";
import { logger } from "@/lib/winston";
import { getList } from "@/utils/querybuilder";

// CREATE STUDENT
export const createStudentService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const sessionId = req?.user?.currentSession;
    const termId = req?.user?.currentTerm;

    // Validate required fields
    if (!schoolId) {
      return res.status(403).json({
        status: "error",
        message: "School ID is required",
      });
    }

    if (!sessionId || !termId) {
      return res.status(400).json({
        status: "error",
        message: "Session ID and Term ID are required",
      });
    }

    // Validate request body
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
      is_active = true, // Default to active
      class_arm_id,
      classArm,
    } = req.body;

    try {
      // Validate class arm exists
      const classArmResult = await query(
        `SELECT id FROM class_arms WHERE id = $1 AND school_id = $2`,
        [classArm || class_arm_id, schoolId]
      );

      if ((classArmResult.rowCount ?? 0) === 0) {
        return sendError(res, "Invalid class arm specified", 400);
      }

      const result = await withTransaction(async (client) => {
        // 1. Create student record
        const studentResult = await client.query(createStudentQuery, [
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

        if (!studentResult.rows[0]?.id) {
          throw new Error("Failed to create student record");
        }

        const studentData = studentResult.rows[0];
        const studentId = studentData.id;

        // 2. Generate secure password and create user account
        // const defaultPassword = generateSecurePassword(); // Consider implementing this
        const defaultPassword = "123456";
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        const userResult = await client.query(createUserQuery, [
          schoolId,
          studentData.first_name,
          studentData.last_name,
          studentData.email,
          hashedPassword,
          "student",
          true,
        ]);

        if (!userResult.rows[0]?.id) {
          throw new Error("Failed to create user account");
        }

        const userData = userResult.rows[0];

        // 3. Create enrollment record
        const enrollmentResult = await client.query(createEnrollmentQuery, [
          schoolId,
          studentId,
          parseInt(classArm || class_arm_id),
          sessionId,
          termId,
          "pending",
          userData.id,
        ]);

        if (!enrollmentResult.rows[0]?.id) {
          throw new Error("Failed to create enrollment record");
        }

        const enrollmentData = enrollmentResult.rows[0];

        return {
          student: studentData,
          user: {
            id: userData.id,
            email: userData.email,
            role: userData.role,
          },
          enrollment: enrollmentData,
          temporaryPassword: defaultPassword,
        };
      });

      // Log successful student creation
      logger.info(`Student created successfully`, {
        studentId: result.student.id,
        admissionNumber: admission_number,
        schoolId,
        createdBy: req.user?.id,
      });

      // Send success response
      sendSuccess(
        req,
        res,
        "Student created successfully",
        result,
        null,
        "student"
      );

      // TODO: Consider sending welcome email with temporary password
      // await sendWelcomeEmail(email, first_name, defaultPassword);
    } catch (error) {
      logger.error("Error creating student:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to create student. Please try again.",
      });
    }
  }
);

// Helper function to generate secure temporary passwords
// function generateSecurePassword(length: number = 8): string {
//   const charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
//   let password = "";
//   for (let i = 0; i < length; i++) {
//     password += charset.charAt(Math.floor(Math.random() * charset.length));
//   }
//   return password;
// }

// GET ALL STUDENTS
export const getAllStudentsService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const {
      page = 1,
      limit = 10,
      is_active,
      search,
      qualification,
      hire_date_from,
      hire_date_to,
      salary_min,
      salary_max,
      sort_by = "created_at",
      sort_order = "DESC",
    } = req.query;

    if (!schoolId) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    const result = await getList(getAllStudentsQuery, [schoolId], req.query, {
      searchFields: ["s.first_name", "s.last_name", "s.email"],
      sortFields: [
        "first_name",
        "last_name",
        "email",
        "class_arm",
        "admission_number",
      ],
      defaultSort: "created_at",
      countField: "s.id",
    });

    sendSuccess(
      req,
      res,
      "Students retrieved successfully",
      result.data,
      result.pagination,
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
