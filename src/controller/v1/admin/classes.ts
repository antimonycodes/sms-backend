import {
  createClassArmQuery,
  createClassLevelQuery,
  getAllClassArmsQuery,
  getAllClassLevelsQuery,
  seedClassLevelsQuery,
} from "@/data/admin.queries";
import { query } from "@/lib/db";
import { logger } from "@/lib/winston";
import { AuthenticatedRequest } from "@/middlewares/auth";
import { asyncHandler, sendSuccess } from "@/utils/sendResponse";
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
      "SELECT id FROM class_levels WHERE school_id = $1 AND id = $2 LIMIT 1",
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
