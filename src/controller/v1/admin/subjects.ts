import {
  createClassSubjectQuery,
  createSubjectQuery,
  getAllSubjectsQuery,
} from "@/data/admin.queries";
import { query, withTransaction } from "@/lib/db";
import { logger } from "@/lib/winston";
import { AuthenticatedRequest } from "@/middlewares/auth";
import { getList } from "@/utils/querybuilder";
import { asyncHandler, sendError, sendSuccess } from "@/utils/sendResponse";
import { Response } from "express";
import { Client } from "pg";

export const createSubjectService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      name,
      subject_code,
      category,
      class_subjects,
      is_compulsory = true,
    } = req.body;
    const schoolId = req.user?.schoolId || req.currentSchoolId;

    const requiredFields = {
      name: "Subject Name",
      class_subjects: "Class",
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
      !class_subjects ||
      !Array.isArray(class_subjects) ||
      class_subjects.length === 0
    ) {
      return sendError(res, "At least one class must be selected ", 400);
    }

    const nameCheck = await query(
      `SELECT * FROM school_subjects WHERE school_id = $1 AND name = $2`,
      [schoolId, name]
    );

    if ((nameCheck.rowCount ?? 0) > 0) {
      return res.status(400).json({
        success: false,
        message: "Subject with this name already exists.",
      });
    }

    // const classLevelIdss = classLevelIds.map((levels) => classLevelId);

    // const result = await query(createSubjectQuery, [
    //   schoolId,
    //   name,
    //   subject_code,
    //   category,
    // ]);

    const result = await withTransaction(async (client) => {
      const subjectResult = await client.query(createSubjectQuery, [
        schoolId,
        name,
        subject_code,
        category,
      ]);

      if (!subjectResult.rows[0] || !subjectResult.rows[0].id) {
        throw new Error("Failed to create subject");
      }
      const subjectData = subjectResult.rows[0];
      const subjectId = subjectData.id;

      for (const classLevel of class_subjects) {
        logger.info(class_subjects);
        const classSubjectResult = await client.query(createClassSubjectQuery, [
          schoolId,
          classLevel,
          subjectId,
          true,
        ]);
        logger.info(classSubjectResult);

        if (subjectResult.rowCount === 0) {
          throw new Error(
            `Failed to create subject association for ${classSubjectResult.name}`
          );
        }
      }
      return subjectData;
    });

    const responseData = {
      ...result,
      class_subjects: class_subjects,
    };

    return sendSuccess(
      req,
      res,
      "Subject created successfully",
      responseData,
      null,
      "subject"
    );
  }
);

export const getAllSubjectsService = asyncHandler(
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

    const result = await getList(getAllSubjectsQuery, [schoolId], req.query, {
      searchFields: ["s.first_name", "s.last_name", "s.email"],
      countField: "ss.id",
    });

    return sendSuccess(
      req,
      res,
      "Subjects retrieved successfully",
      result.data,
      result.pagination,

      "subjects"
    );
  }
);

export const editSubjectService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, subject_code, category } = req.body;
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const id = req.params.id;

    if (!name || !subject_code || !category) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const subjectCheck = await query(
      `SELECT * FROM school_subjects WHERE school_id = $1 AND id = $2`,
      [schoolId, id]
    );

    if ((subjectCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    const nameCheck = await query(
      `SELECT * FROM school_subjects WHERE school_id = $1 AND name = $2 AND id != $3`,
      [schoolId, name, id]
    );

    if ((nameCheck.rowCount ?? 0) > 0) {
      return res.status(400).json({
        success: false,
        message: "Subject with this name already exists.",
      });
    }

    const result = await query(
      `UPDATE school_subjects SET name = $1, subject_code = $2, category = $3 WHERE id = $4 RETURNING *`,
      [name, subject_code, category, id]
    );

    return sendSuccess(
      req,
      res,
      "Subject updated successfully",
      result.rows[0],
      null,
      "subject"
    );
  }
);

export const deleteSubjectService = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId || req.currentSchoolId;
    const id = req.params.id;

    const subjectCheck = await query(
      `SELECT * FROM school_subjects WHERE school_id = $1 AND id = $2`,
      [schoolId, id]
    );

    if ((subjectCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    await query(`DELETE FROM school_subjects WHERE id = $1`, [id]);

    return sendSuccess(
      req,
      res,
      "Subject deleted successfully",
      null,
      null,
      "subject"
    );
  }
);
