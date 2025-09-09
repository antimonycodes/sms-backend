import {
  createStudentLeadershipRole,
  createStudentRolesQuery,
  deleteStudentLeadershipRole,
  getAllStudentsLeadershipRolesQuery,
  getAllStudentsRolesQuery,
  updateStudentLeadershipRole,
} from "@/data/leadershiip.queries";
import { query } from "@/lib/db";
import { AuthenticatedRequest } from "@/middlewares/auth";
import { asyncHandler, sendError, sendSuccess } from "@/utils/sendResponse";
import { Response } from "express";

export const createLeadershipRolesService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const { name, category } = req.body;

    if (!name) return sendError(res, "name is required");
    if (!category) return sendError(res, "category is required");

    const nameCheck = await query(
      "SELECT id FROM leadership_roles WHERE school_id = $1 AND name = $2 LIMIT 1",
      [schoolId, name]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Role: ${name} already exists. Please choose a different name.`,
      });
    }

    const result = await query(createStudentRolesQuery, [
      schoolId,
      name,
      category,
    ]);

    sendSuccess(
      req,
      res,
      "Leadership role created successfully",
      result.rows[0]
    );
  }
);

export const getAllSchoolLeadershipRoleService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;

    const result = await query(getAllStudentsRolesQuery, [schoolId]);
    sendSuccess(
      req,
      res,
      "Leadership roles  retrieved successfully",
      result.rows,
      null,
      "roles"
    );
  }
);

//
export const assignStudentLeadershipService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const { student_id, role_id, class_arm_id, session_id, term_id } = req.body;

    if (!student_id || !role_id || !class_arm_id || !session_id || !term_id) {
      return sendError(res, "All fields are required", 400);
    }

    const result = await query(createStudentLeadershipRole, [
      schoolId,
      student_id,
      role_id,
      class_arm_id,
      session_id,
      term_id,
    ]);

    return sendSuccess(
      req,
      res,
      "Student leadership role assigned successfully",
      result.rows[0]
    );
  }
);

//
export const getAllStudentLeadershipRolesService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const { sessionId, classArmId } = req.query;

    const result = await query(getAllStudentsLeadershipRolesQuery, [
      schoolId,
      sessionId || null,
      classArmId || null,
    ]);

    sendSuccess(
      req,
      res,
      "Student leadership roles retrieved successfully",
      result.rows,
      null,
      "studentLeadershipRoles"
    );
  }
);

// Update Student Leadership Assignment
export const updateStudentLeadershipService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const { id } = req.params;
    const { student_id, role_id, class_arm_id, session_id, term_id } = req.body;

    const result = await query(updateStudentLeadershipRole, [
      id,
      student_id,
      role_id,
      class_arm_id,
      session_id,
      term_id,
      schoolId,
    ]);

    if (result.rows.length === 0) {
      return sendError(res, "Leadership assignment not found", 404);
    }

    return sendSuccess(
      req,
      res,
      "Student leadership role updated successfully",
      result.rows[0]
    );
  }
);

// Delete Student Leadership Assignment
export const deleteStudentLeadershipService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const { id } = req.params;

    const result = await query(deleteStudentLeadershipRole, [id, schoolId]);

    if (result.rows.length === 0) {
      return sendError(res, "Leadership assignment not found", 404);
    }

    return sendSuccess(
      req,
      res,
      "Student leadership role deleted successfully",
      result.rows[0]
    );
  }
);
