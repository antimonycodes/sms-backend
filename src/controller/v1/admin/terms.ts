import {
  activateTermQuery,
  createTermQuery,
  getActiveTermQuery,
  getAllTermsQuery,
  seedTermsQuery,
} from "@/data/admin.queries";
import { query } from "@/lib/db";
import { logger } from "@/lib/winston";
import { AuthenticatedRequest } from "@/middlewares/auth";
import { asyncHandler, sendError, sendSuccess } from "@/utils/sendResponse";
import { Response } from "express";

export const createTermService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, isCurrent } = req.body;
    const schoolId = req.user?.schoolId || req.currentSchoolId;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Term name is required.",
      });
    }

    const result = await query(createTermQuery, [schoolId, name, isCurrent]);
    return sendSuccess(req, res, "Term created successfully", result.rows[0]);
  }
);

export const ensureDefaultTermsService = async (schoolId: string) => {
  // const schoolId = req.user?.schoolId || req.currentSchoolId;

  const check = await query(`SELECT * FROM school_terms WHERE school_id = $1`, [
    schoolId,
  ]);

  //   if (check.rows.length > 0) {
  //     return sendSuccess(res, "Default terms already exist", check.rows);
  //   }

  if (check.rows.length === 0) {
    const defaultTerms = await query(seedTermsQuery, [schoolId]);
    logger.info("Default terms created successfully", defaultTerms.rows);
  }
};

export const getAllTermsService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const result = await query(getAllTermsQuery, [schoolId]);
    return sendSuccess(
      req,
      res,
      "All terms retrieved successfully",
      result.rows,
      null,
      "terms"
    );
  }
);

export const getActiveTermService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const result = await query(getActiveTermQuery, [schoolId]);
    return sendSuccess(
      req,
      res,
      "Active term retrieved successfully",
      result.rows,
      null,
      "terms"
    );
  }
);

export const activateTermService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { termId } = req.params; // term id
    const schoolId = req.user?.schoolId || req.currentSchoolId;

    // start transaction
    try {
      await query("BEGIN");

      // deactivate all terms for this school
      await query(
        `UPDATE school_terms 
         SET is_current = false 
         WHERE school_id = $1`,
        [schoolId]
      );

      // activate the chosen term
      const result = await query(
        `UPDATE school_terms
         SET is_current = true
         WHERE id = $1 AND school_id = $2
         RETURNING *`,
        [termId, schoolId]
      );

      if (result.rows.length === 0) {
        await query("ROLLBACK");
        return sendError(res, "Term not found or not part of your school");
      }

      await query("COMMIT");

      const activatedTerm = result.rows[0];
      return sendSuccess(
        req,
        res,
        `Term ${activatedTerm.name} activated successfully`,
        activatedTerm
      );
    } catch (error) {
      await query("ROLLBACK");
      throw error;
    }
  }
);
