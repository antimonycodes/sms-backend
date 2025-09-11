import {
  createStudentLeadershipRole,
  createStudentRolesQuery,
  deleteStudentLeadershipRole,
  deleteStudentRolesQuery,
  getAllStudentsLeadershipRolesQuery,
  getAllStudentsRolesQuery,
  updateStudentLeadershipRole,
  updateStudentRolesQuery,
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
// Update Student Leadership Assignment
export const updateSchoolLeadershipService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const { id } = req.params;
    const { name, category } = req.body;

    if (!name) return sendError(res, "name is required");
    if (!category) return sendError(res, "category is required");

    const result = await query(updateStudentRolesQuery, [
      id,
      schoolId,
      name,
      category,
    ]);

    if (result.rows.length === 0) {
      return sendError(res, "Leadership Role not found", 404);
    }

    return sendSuccess(
      req,
      res,
      "leadership role updated successfully",
      result.rows[0]
    );
  }
);

// Delete Student Leadership Assignment
export const deleteSchoolLeadershipService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const { id } = req.params;

    const result = await query(deleteStudentRolesQuery, [id, schoolId]);

    if (result.rows.length === 0) {
      return sendError(res, "Leadership role not found", 404);
    }

    return sendSuccess(
      req,
      res,
      " leadership role deleted successfully",
      result.rows[0]
    );
  }
);

//
export const assignStudentLeadershipService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const sessionId = req.user?.currentSession;
    const termId = req.user?.currentTerm;
    const { student_id, role_id, class_arm_id, session_id, term_id } = req.body;

    if (!student_id || !role_id || !class_arm_id) {
      return sendError(res, "All fields are required", 400);
    }

    const result = await query(createStudentLeadershipRole, [
      schoolId,
      student_id,
      role_id,
      class_arm_id,
      sessionId,
      termId,
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

export const getLeadershipStatsService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const currentSession = req.user?.currentSession;
    const { session_id } = req.query;

    if (!schoolId) {
      return sendError(res, "School ID is required", 400);
    }

    // Use frontend-provided session_id or fallback to currentSession
    const sessionFilter = session_id || currentSession;

    const statsQuery = `
      SELECT 
        COUNT(*) AS total_leaders,
        COUNT(*) FILTER (WHERE s.gender = 'Male') AS male_leaders,
        COUNT(*) FILTER (WHERE s.gender = 'Female') AS female_leaders,
        COUNT(*) FILTER (WHERE lr.category = 'school_level') AS school_level_leaders,
        COUNT(*) FILTER (WHERE lr.category = 'class_level') AS class_level_leaders,
        ss.session_name
      FROM student_leaderships sl
      JOIN students s ON sl.student_id = s.id
      JOIN leadership_roles lr ON sl.role_id = lr.id
      JOIN school_sessions ss ON sl.session_id = ss.id
      WHERE sl.session_id = $1
        AND s.school_id = $2
      GROUP BY ss.session_name
    `;

    const result = await query(statsQuery, [sessionFilter, schoolId]);
    const stats = result.rows[0];

    const total = Number(stats.total_leaders) || 0;
    const male = Number(stats.male_leaders) || 0;
    const female = Number(stats.female_leaders) || 0;
    const schoolLevel = Number(stats.school_level_leaders) || 0;
    const classLevel = Number(stats.class_level_leaders) || 0;

    const malePercentage =
      total > 0 ? ((male / total) * 100).toFixed(0) + "%" : "0%";
    const femalePercentage =
      total > 0 ? ((female / total) * 100).toFixed(0) + "%" : "0%";
    const schoolLevelPercentage =
      total > 0 ? ((schoolLevel / total) * 100).toFixed(0) + "%" : "0%";
    const classLevelPercentage =
      total > 0 ? ((classLevel / total) * 100).toFixed(0) + "%" : "0%";

    const responseData = {
      session: stats.session_name,
      stats: [
        { title: "Total Leaders", value: total, percentage: "100%" },
        { title: "Male Leaders", value: male, percentage: malePercentage },
        {
          title: "Female Leaders",
          value: female,
          percentage: femalePercentage,
        },
        {
          title: "School Level Leaders",
          value: schoolLevel,
          percentage: schoolLevelPercentage,
        },
        {
          title: "Class Level Leaders",
          value: classLevel,
          percentage: classLevelPercentage,
        },
      ],
    };

    return sendSuccess(
      req,
      res,
      "Leadership stats retrieved successfully",
      responseData,
      null,
      "leadershipStats"
    );
  }
);
