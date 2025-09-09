import {
  createTeacherPrimarySubjectQuery,
  createTeacherQuery,
  getTeacherByEmailQuery,
  getTeacherByIdQuery,
  validateSubjectIdsQuery,
  getAllTeachersQuery,
  getTeacherWithSubjectsQuery,
  updateTeacherQuery,
  deleteTeacherQuery,
  deleteTeacherSubjectsQuery,
  getTeacherSubjectsQuery,
} from "@/data/admin.queries";
import { createUserQuery } from "@/data/sqlQuery";
import { query, withTransaction } from "@/lib/db";
import { logger } from "@/lib/winston";
import { AuthenticatedRequest } from "@/middlewares/auth";
import { asyncHandler, sendSuccess, sendError } from "@/utils/sendResponse";
import { Response } from "express";
import bcrypt from "bcryptjs";
import { getList } from "@/utils/querybuilder";

interface CreateTeacherRequest {
  employee_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone: string;
  address: string;
  qualification: string;
  hire_date: string;
  salary: number;
  is_active?: boolean;
  primary_subjects: Array<{
    id: string;
    name: string;
  }>;
}

interface UpdateTeacherRequest {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  qualification?: string;
  hire_date?: string;
  salary?: number;
  is_active?: boolean;
  primary_subjects?: Array<{
    id: string;
    name: string;
  }>;
}

// Validation helper functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date <= new Date();
};

const validateSalary = (salary: any): boolean => {
  return typeof salary === "number" && salary > 0;
};

// CREATE TEACHER SERVICE
export const createTeacherService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      employee_id,
      first_name,
      last_name,
      middle_name,
      email,
      phone,
      address,
      qualification,
      hire_date,
      salary,
      is_active = true,
      primary_subjects,
    }: CreateTeacherRequest = req.body;

    const schoolId = req.user?.schoolId || req.currentSchoolId;

    const requiredFields = {
      employee_id: "Employee ID",
      first_name: "First name",
      last_name: "Last name",
      email: "Email",
      phone: "Phone",
      address: "Address",
      qualification: "Qualification",
      hire_date: "Hire date",
      salary: "Salary",
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key]) => !req.body[key])
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      return sendError(
        res,
        `Missing required fields: ${missingFields.join(", ")}`,
        422
      );
    }

    if (!schoolId) {
      return sendError(res, "School ID is required", 400);
    }

    if (
      !primary_subjects ||
      !Array.isArray(primary_subjects) ||
      primary_subjects.length === 0
    ) {
      return sendError(res, "At least one primary subject is required", 400);
    }

    // // Validate each subject in the array
    // for (const subject of primary_subjects) {
    //   if (
    //     !subject.id
    //     // !subject.name
    //     // typeof subject.id !== "string" ||
    //     // typeof subject.name !== "string"
    //   ) {
    //     return sendError(res, "Each subject must have valid id and name", 400);
    //   }
    // }

    if (!validateEmail(email)) {
      return sendError(res, "Invalid email format", 400);
    }

    if (!phone) {
      return sendError(res, "Invalid phone number format", 400);
    }

    if (!validateDate(hire_date)) {
      return sendError(
        res,
        "Invalid hire date or hire date cannot be in the future",
        400
      );
    }

    if (!validateSalary(salary)) {
      return sendError(res, "Salary must be a positive number", 400);
    }

    if (typeof is_active !== "boolean") {
      return sendError(res, "is_active must be a boolean value", 400);
    }

    try {
      // Check duplicates
      const existingTeacherById = await query(getTeacherByIdQuery, [
        employee_id,
        schoolId,
      ]);

      if ((existingTeacherById.rowCount ?? 0) > 0) {
        return sendError(
          res,
          "Teacher with this employee ID already exists",
          409
        );
      }

      const existingTeacherByEmail = await query(getTeacherByEmailQuery, [
        email,
        schoolId,
      ]);

      if ((existingTeacherByEmail.rowCount ?? 0) > 0) {
        return sendError(res, "Teacher with this email already exists", 409);
      }

      // Validate subject IDs
      const subjectIds = primary_subjects.map((subject) => subject);
      const validSubjects = await query(validateSubjectIdsQuery, [
        subjectIds,
        schoolId,
      ]);

      if (validSubjects.rowCount !== subjectIds.length) {
        return sendError(res, "One or more subject IDs are invalid", 400);
      }

      const result = await withTransaction(async (client) => {
        const teacherResult = await client.query(createTeacherQuery, [
          schoolId,
          employee_id,
          first_name.trim(),
          last_name.trim(),
          middle_name?.trim() || null,
          email.toLowerCase().trim(),
          phone.trim(),
          address.trim(),
          qualification.trim(),
          hire_date,
          salary,
          is_active,
        ]);

        if (!teacherResult.rows[0] || !teacherResult.rows[0].id) {
          throw new Error("Failed to create teacher");
        }

        const teacherData = teacherResult.rows[0];
        const teacherId = teacherData.id;
        const password = "123456";
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. Create admin user (using school name as first_name)
        const userResult = await query(createUserQuery, [
          schoolId, // school_id
          teacherData.first_name, // first_name (same as school name)
          teacherData.last_name, // last_name (null for admin)
          teacherData.email, // email (same as school email)
          hashedPassword,
          "teacher", // role
          true, // is_active
        ]);

        logger.info(userResult);

        for (const subject of primary_subjects) {
          const subjectResult = await client.query(
            createTeacherPrimarySubjectQuery,
            [schoolId, teacherId, subject]
          );

          if (subjectResult.rowCount === 0) {
            throw new Error(
              `Failed to create subject association for ${subject.name}`
            );
          }
        }

        return teacherData;
      });

      const responseData = {
        ...result,
        primary_subjects: primary_subjects,
      };

      return sendSuccess(
        req,
        res,
        "Teacher created successfully",
        responseData,
        null,
        "teacher"
      );
    } catch (error) {
      logger.error("Error creating teacher:", error);

      if (error instanceof Error) {
        if (error.message.includes("duplicate key")) {
          return sendError(
            res,
            "Teacher with this information already exists",
            409
          );
        }
        if (error.message.includes("foreign key")) {
          return sendError(res, "Invalid reference data provided", 400);
        }
      }

      return sendError(
        res,
        "Internal server error while creating teacher",
        500
      );
    }
  }
);

// GET ALL TEACHERS SERVICE
export const getAllTeachersService = asyncHandler(
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
      return sendError(res, "School ID is required", 400);
    }

    try {
      const baseQuery = `
      SELECT t.*, 
             COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', s.id,
          'name', s.name
        )
      ) FILTER (WHERE s.id IS NOT NULL), '[]'
    ) as subjects
      FROM teachers t
      LEFT JOIN teacher_primary_subjects ts ON t.id = ts.teacher_id  
      LEFT JOIN school_subjects s ON ts.subject_id = s.id
      WHERE t.school_id = $1
      GROUP BY t.id
    `;

      const result = await getList(baseQuery, [schoolId], req.query, {
        searchFields: ["t.first_name", "t.last_name", "t.email"],
        sortFields: ["first_name", "last_name", "email", "hire_date"],
        defaultSort: "created_at",
        countField: "t.id",
      });

      // return res.json({
      //   status: "success",
      //   data: result.data,
      //   pagination: result.pagination,
      // });

      return sendSuccess(
        req,
        res,
        "teachers received successfully",
        result.data,
        result.pagination,
        "teachers"
      );
    } catch (error) {
      logger.error("Error retrieving teachers:", error);
      return sendError(
        res,
        "Internal server error while retrieving teachers",
        500
      );
    }
  }
);

// GET SINGLE TEACHER SERVICE
export const getTeacherService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { teacherId } = req.params;
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    logger.info(teacherId);

    if (!schoolId) {
      return sendError(res, "School ID is required", 400);
    }

    if (!teacherId) {
      return sendError(res, "Teacher ID is required", 400);
    }

    try {
      const teacherQuery = `
        SELECT 
          t.*,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', s.id,
                'name', s.name,
                'code', s.subject_code
              )
            ) FILTER (WHERE s.id IS NOT NULL), '[]'
          ) as primary_subjects
        FROM teachers t
        LEFT JOIN teacher_primary_subjects tps ON t.id = tps.teacher_id
        LEFT JOIN school_subjects s ON tps.subject_id = s.id AND s.school_id = $1
        WHERE t.id = $2 AND t.school_id = $1
        GROUP BY t.id
      `;

      const result = await query(teacherQuery, [schoolId, teacherId]);

      if (result.rowCount === 0) {
        return sendError(res, "Teacher not found", 404);
      }

      return sendSuccess(
        req,
        res,
        "Teacher retrieved successfully",
        result.rows[0],
        null,
        "teacher"
      );
    } catch (error) {
      logger.error("Error retrieving teacher:", error);
      return sendError(
        res,
        "Internal server error while retrieving teacher",
        500
      );
    }
  }
);

// UPDATE TEACHER SERVICE
export const updateTeacherService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { teacherId } = req.params;
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const updateData: UpdateTeacherRequest = req.body;

    if (!schoolId) {
      return sendError(res, "School ID is required", 400);
    }

    if (!teacherId) {
      return sendError(res, "Teacher ID is required", 400);
    }

    if (Object.keys(updateData).length === 0) {
      return sendError(res, "No data provided for update", 400);
    }

    try {
      // Check if teacher exists
      const existingTeacher = await query(
        "SELECT * FROM teachers WHERE id = $1 AND school_id = $2",
        [teacherId, schoolId]
      );

      if (existingTeacher.rowCount === 0) {
        return sendError(res, "Teacher not found", 404);
      }

      // Validate email if provided
      if (updateData.email && !validateEmail(updateData.email)) {
        return sendError(res, "Invalid email format", 400);
      }

      // Check email uniqueness if email is being updated
      if (
        updateData.email &&
        updateData.email !== existingTeacher.rows[0].email
      ) {
        const emailCheck = await query(getTeacherByEmailQuery, [
          updateData.email,
          schoolId,
        ]);

        if ((emailCheck.rowCount ?? 0) > 0) {
          return sendError(res, "Teacher with this email already exists", 409);
        }
      }

      //   // Validate other fields
      //   if (!updateData.phone) {
      //     return sendError(res, "Invalid phone number format", 400);
      //   }

      if (updateData.hire_date && !validateDate(updateData.hire_date)) {
        return sendError(res, "Invalid hire date", 400);
      }

      if (
        updateData.salary !== undefined &&
        !validateSalary(updateData.salary)
      ) {
        return sendError(res, "Salary must be a positive number", 400);
      }

      // Validate subjects if provided
      if (updateData.primary_subjects) {
        if (
          !Array.isArray(updateData.primary_subjects) ||
          updateData.primary_subjects.length === 0
        ) {
          return sendError(
            res,
            "At least one primary subject is required",
            400
          );
        }

        const subjectIds = updateData.primary_subjects.map(
          (subject) => subject.id
        );
        const validSubjects = await query(validateSubjectIdsQuery, [
          subjectIds,
          schoolId,
        ]);

        if (validSubjects.rowCount !== subjectIds.length) {
          return sendError(res, "One or more subject IDs are invalid", 400);
        }
      }

      const result = await withTransaction(async (client) => {
        // Build dynamic update query
        const updateFields: string[] = [];
        const updateValues: any[] = [schoolId, teacherId];
        let paramIndex = 3;

        if (updateData.first_name) {
          updateFields.push(`first_name = $${paramIndex}`);
          updateValues.push(updateData.first_name.trim());
          paramIndex++;
        }

        if (updateData.last_name) {
          updateFields.push(`last_name = $${paramIndex}`);
          updateValues.push(updateData.last_name.trim());
          paramIndex++;
        }

        if (updateData.middle_name !== undefined) {
          updateFields.push(`middle_name = $${paramIndex}`);
          updateValues.push(updateData.middle_name?.trim() || null);
          paramIndex++;
        }

        if (updateData.email) {
          updateFields.push(`email = $${paramIndex}`);
          updateValues.push(updateData.email.toLowerCase().trim());
          paramIndex++;
        }

        if (updateData.phone) {
          updateFields.push(`phone = $${paramIndex}`);
          updateValues.push(updateData.phone.trim());
          paramIndex++;
        }

        if (updateData.address) {
          updateFields.push(`address = $${paramIndex}`);
          updateValues.push(updateData.address.trim());
          paramIndex++;
        }

        if (updateData.qualification) {
          updateFields.push(`qualification = $${paramIndex}`);
          updateValues.push(updateData.qualification.trim());
          paramIndex++;
        }

        if (updateData.hire_date) {
          updateFields.push(`hire_date = $${paramIndex}`);
          updateValues.push(updateData.hire_date);
          paramIndex++;
        }

        if (updateData.salary !== undefined) {
          updateFields.push(`salary = $${paramIndex}`);
          updateValues.push(updateData.salary);
          paramIndex++;
        }

        if (updateData.is_active !== undefined) {
          updateFields.push(`is_active = $${paramIndex}`);
          updateValues.push(updateData.is_active);
          paramIndex++;
        }

        // Add updated_at
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        const updateQuery = `
          UPDATE teachers 
          SET ${updateFields.join(", ")}
          WHERE school_id = $1 AND id = $2
          RETURNING *
        `;

        const teacherResult = await client.query(updateQuery, updateValues);

        // Update subjects if provided
        if (updateData.primary_subjects) {
          // Delete existing subject associations
          await client.query(
            "DELETE FROM teacher_primary_subjects WHERE teacher_id = $1 AND school_id = $2",
            [teacherId, schoolId]
          );

          // Create new subject associations
          for (const subject of updateData.primary_subjects) {
            await client.query(createTeacherPrimarySubjectQuery, [
              schoolId,
              teacherId,
              subject.id,
            ]);
          }
        }

        return teacherResult.rows[0];
      });

      // Get updated teacher with subjects
      const updatedTeacherQuery = `
        SELECT 
          t.*,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', s.id,
                'name', s.name,
                'code', s.subject_code
              )
            ) FILTER (WHERE s.id IS NOT NULL), '[]'
          ) as primary_subjects
        FROM teachers t
        LEFT JOIN teacher_primary_subjects tps ON t.id = tps.teacher_id
        LEFT JOIN school_subjects s ON tps.subject_id = s.id AND s.school_id = $1
        WHERE t.id = $2 AND t.school_id = $1
        GROUP BY t.id
      `;

      const finalResult = await query(updatedTeacherQuery, [
        schoolId,
        teacherId,
      ]);

      return sendSuccess(
        req,
        res,
        "Teacher updated successfully",
        finalResult.rows[0],
        null,
        "teacher"
      );
    } catch (error) {
      logger.error("Error updating teacher:", error);

      if (error instanceof Error) {
        if (error.message.includes("duplicate key")) {
          return sendError(
            res,
            "Teacher with this information already exists",
            409
          );
        }
        if (error.message.includes("foreign key")) {
          return sendError(res, "Invalid reference data provided", 400);
        }
      }

      return sendError(
        res,
        "Internal server error while updating teacher",
        500
      );
    }
  }
);

// DELETE TEACHER SERVICE
export const deleteTeacherService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { teacherId } = req.params;
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const { soft_delete = false } = req.query; // Default to soft delete

    if (!schoolId) {
      return sendError(res, "School ID is required", 400);
    }

    if (!teacherId) {
      return sendError(res, "Teacher ID is required", 400);
    }

    try {
      // Check if teacher exists
      const existingTeacher = await query(
        "SELECT * FROM teachers WHERE id = $1 AND school_id = $2",
        [teacherId, schoolId]
      );

      if (existingTeacher.rowCount === 0) {
        return sendError(res, "Teacher not found", 404);
      }

      // Check if teacher has any active assignments (you might want to add this check)
      // const hasActiveAssignments = await query(
      //   "SELECT COUNT(*) FROM class_teachers WHERE teacher_id = $1 AND is_active = true",
      //   [teacherId]
      // );

      // if (parseInt(hasActiveAssignments.rows[0].count) > 0) {
      //   return sendError(res, "Cannot delete teacher with active class assignments", 400);
      // }

      if (soft_delete === "true") {
        // Soft delete - just mark as inactive
        const softDeleteResult = await query(
          `UPDATE teachers 
           SET is_active = false, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1 AND school_id = $2 
           RETURNING *`,
          [teacherId, schoolId]
        );

        return sendSuccess(
          req,
          res,
          "Teacher deactivated successfully",
          softDeleteResult.rows[0],
          null,
          "teacher"
        );
      } else {
        // Hard delete - remove from database
        await withTransaction(async (client) => {
          // Delete subject associations first
          await client.query(
            "DELETE FROM teacher_primary_subjects WHERE teacher_id = $1 AND school_id = $2",
            [teacherId, schoolId]
          );

          // Delete teacher record
          await client.query(
            "DELETE FROM teachers WHERE id = $1 AND school_id = $2",
            [teacherId, schoolId]
          );
        });

        return sendSuccess(
          req,
          res,
          "Teacher deleted successfully",
          { id: teacherId },
          null,
          "teacher"
        );
      }
    } catch (error) {
      logger.error("Error deleting teacher:", error);

      if (error instanceof Error) {
        if (error.message.includes("violates foreign key constraint")) {
          return sendError(
            res,
            "Cannot delete teacher due to existing references. Use soft delete instead.",
            400
          );
        }
      }

      return sendError(
        res,
        "Internal server error while deleting teacher",
        500
      );
    }
  }
);
