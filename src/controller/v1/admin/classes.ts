import {
  createClassArmQuery,
  createClassLevelQuery,
  getAllClassArmsQuery,
  getAllClassLevelsQuery,
  seedClassLevelsQuery,
} from "@/data/admin.queries";
import { getStudentsInAclassQuery } from "@/data/class.queries";
import { query } from "@/lib/db";
import { logger } from "@/lib/winston";
import { AuthenticatedRequest } from "@/middlewares/auth";
import { getList } from "@/utils/querybuilder";
import { asyncHandler, sendError, sendSuccess } from "@/utils/sendResponse";
import { Request, Response } from "express";

export const ensureDefaultClassLevels = async (schoolId: string) => {
  // check if class levels already exist for this school
  const check = await query(
    "SELECT id FROM class_levels WHERE school_id = $1 LIMIT 1",
    [schoolId]
  );

  if (check.rows.length === 0) {
    // seed defaults if none exist
    await query(seedClassLevelsQuery, [schoolId]);
    logger.info(`Default class levels created for school ${schoolId}`);
  }
};
export const createClassLevelService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { className } = req.body;
    const schoolId = req.user?.schoolId || req.currentSchoolId;

    if (!className) {
      return res.status(400).json({
        success: false,
        message: "Class name is required.",
      });
    }

    const result = await query(createClassLevelQuery, [schoolId, className]);
    return sendSuccess(
      req,
      res,
      "Class level created successfully",
      result.rows[0]
    );
  }
);

export const getAllClassLevelService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const result = await query(getAllClassLevelsQuery, [schoolId]);
    return sendSuccess(
      req,
      res,
      "Class levels retrieved successfully",
      result.rows,
      null,
      "classLevel"
    );
  }
);

export const createClassArmService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { classLevelId, armName } = req.body;
    const schoolId = req.user?.schoolId || req.currentSchoolId;

    if (!classLevelId || !armName) {
      return res.status(400).json({
        success: false,
        message: "Class level ID and arm name are required.",
      });
    }

    const nameCheck = await query(
      `SELECT id FROM class_levels WHERE school_id = $1 AND id = $2 LIMIT 1`,
      [schoolId, classLevelId]
    );

    if (nameCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Class level ID is invalid for this school.`,
      });
    }

    const armCheck = await query(
      "SELECT id FROM class_arms WHERE school_id = $1 AND name = $2 LIMIT 1",
      [schoolId, armName]
    );

    if (armCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Class arm ${armName} already exists. Please choose a different name.`,
      });
    }

    const result = await query(createClassArmQuery, [
      schoolId,
      classLevelId,
      armName,
    ]);
    return sendSuccess(
      req,
      res,
      "Class arm created successfully",
      result.rows[0],
      null,
      "classArm"
    );
  }
);

export const updateClassArmService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { classArmId, armName } = req.body;
    const schoolId = req.user?.schoolId || req.currentSchoolId;

    if (!classArmId || !armName) {
      return res.status(400).json({
        success: false,
        message: "Class arm ID and arm name are required.",
      });
    }

    const armCheck = await query(
      "SELECT id FROM class_arms WHERE school_id = $1 AND id = $2 LIMIT 1",
      [schoolId, classArmId]
    );

    if (armCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Class arm ID is invalid for this school.",
      });
    }

    const nameCheck = await query(
      "SELECT id FROM class_arms WHERE school_id = $1 AND name = $2 AND id != $3 LIMIT 1",
      [schoolId, armName, classArmId]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Class arm ${armName} already exists. Please choose a different name.`,
      });
    }

    const result = await query(
      "UPDATE class_arms SET name = $1 WHERE id = $2 AND school_id = $3 RETURNING *",
      [armName, classArmId, schoolId]
    );

    return sendSuccess(
      req,
      res,
      "Class arm updated successfully",
      result.rows[0]
    );
  }
);

export const deleteClassArmService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { classArmId } = req.body;
    const schoolId = req.user?.schoolId || req.currentSchoolId;

    if (!classArmId) {
      return res.status(400).json({
        success: false,
        message: "Class arm ID is required.",
      });
    }

    const armCheck = await query(
      "SELECT id FROM class_arms WHERE school_id = $1 AND id = $2 LIMIT 1",
      [schoolId, classArmId]
    );

    if (armCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Class arm ID is invalid for this school.",
      });
    }

    await query("DELETE FROM class_arms WHERE id = $1 AND school_id = $2", [
      classArmId,
      schoolId,
    ]);

    return sendSuccess(req, res, "Class arm deleted successfully");
  }
);

export const getAllClassArmsService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;

    const result = await query(getAllClassArmsQuery, [schoolId]);
    return sendSuccess(
      req,
      res,
      "Class arms retrieved successfully",
      result.rows,
      null,
      "classArms"
    );
  }
);

export const getStudentsByClassIdService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const role = req.user?.role;
    const currentSession = req.user?.currentSession;
    const { classArmId } = req.params;

    const {
      page = 1,
      limit = 10,
      search,
      sort_by = "s.last_name",
      sort_order = "ASC",
      session_id, //
    } = req.query;

    if (!classArmId) {
      return sendError(res, "Class arm is required", 400);
    }

    // default sessionId = currentSession if frontend didn’t provide
    const sessionFilter = session_id || currentSession;

    const baseQuery = `
      SELECT s.*, se.is_promoted, se.promotion_status
      FROM student_enrollments se
      INNER JOIN students s ON se.student_id = s.id
      JOIN class_arms ca ON se.class_arm_id = ca.id
      JOIN class_levels cl ON ca.class_level_id = cl.id
      WHERE ca.id = $1
        AND se.session_id = $2
    `;

    const result = await getList(
      baseQuery,
      [classArmId, sessionFilter], // 👈 always 2 params only
      req.query,
      {
        searchFields: ["s.first_name", "s.last_name", "s.email"],
        sortFields: ["s.first_name", "s.last_name", "s.email"],
        defaultSort: "s.last_name",
        countField: "s.id",
      }
    );

    return sendSuccess(
      req,
      res,
      "Class Students retrieved successfully",
      result.data,
      result.pagination,
      "students"
    );
  }
);

export const getClassArmStatsService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { classArmId } = req.params;
    const schoolId = req.user?.schoolId;
    const currentSession = req.user?.currentSession;
    const { session_id } = req.query;

    if (!classArmId) {
      return sendError(res, "Class arm is required", 400);
    }

    const sessionFilter = session_id || currentSession;

    const statsQuery = `
SELECT 
  COUNT(*) AS total_students,
  COUNT(*) FILTER (WHERE s.gender = 'Male') AS male_students,
  COUNT(*) FILTER (WHERE s.gender = 'Female') AS female_students,
  ROUND(AVG(EXTRACT(YEAR FROM age(s.date_of_birth)))) AS average_age,
  ca.name AS class_arm_name,
  ss.session_name,
  st.name AS term_name
FROM student_enrollments se
JOIN students s ON se.student_id = s.id
JOIN class_arms ca ON se.class_arm_id = ca.id
JOIN school_sessions ss ON se.session_id = ss.id
JOIN school_terms st ON se.term_id = st.id
WHERE ca.id = $1
  AND se.session_id = $2
  AND s.school_id = $3
GROUP BY ca.name, ss.session_name, st.name;

`;

    const result = await query(statsQuery, [
      classArmId,
      sessionFilter,
      schoolId,
    ]);

    const stats = result.rows[0];
    if (!stats) {
      return sendSuccess(req, res, "No stats found", {
        classArm: null,
        session: null,
        term: null,
        stats: [],
      });
    }

    const total = Number(stats.total_students) || 0;
    const male = Number(stats.male_students) || 0;
    const female = Number(stats.female_students) || 0;

    const malePercentage =
      total > 0 ? ((male / total) * 100).toFixed(0) + "%" : "0%";
    const femalePercentage =
      total > 0 ? ((female / total) * 100).toFixed(0) + "%" : "0%";

    const responseData = {
      classArm: stats.class_arm_name,
      session: stats.session_name,
      term: stats.term_name,
      stats: [
        { title: "Total Students", value: total, percentage: "100%" },
        { title: "Male Students", value: male, percentage: malePercentage },
        {
          title: "Female Students",
          value: female,
          percentage: femalePercentage,
        },
        {
          title: "Average Age",
          value: stats.average_age ? Number(stats.average_age) : null,
          percentage: null,
        },
      ],
    };

    return sendSuccess(
      req,
      res,
      "Class Arm stats retrieved successfully",
      responseData,
      null,
      "classStats"
    );
  }
);
