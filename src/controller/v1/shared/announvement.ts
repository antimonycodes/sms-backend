import {
  createAnnouncementQuery,
  deleteAnnouncementQuery,
  getAnnouncementsQuery,
} from "@/data/queries";
import { query } from "@/lib/db";
import { logger } from "@/lib/winston";
import { AuthenticatedRequest } from "@/middlewares/auth";
import { asyncHandler, sendError, sendSuccess } from "@/utils/sendResponse";
import { Response } from "express";

export const createAnnouncement = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { title, subject } = req.body;
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;

    logger.info(req.body);

    if (!title) return sendError(res, "Title is required", 400);
    if (!subject) return sendError(res, "Subject is required", 400);
    if (!userId) return sendError(res, "UserId is required", 400);
    if (!schoolId) return sendError(res, "schoolId is required", 400);

    const result = await query(createAnnouncementQuery, [
      schoolId,
      userId,
      title,
      subject,
    ]);

    const data = result.rows[0];
    logger.info(data);

    return sendSuccess(
      req,
      res,
      "Announcement created successfully",
      data,
      null,
      "announcement"
    );
  }
);

export const getAnnouncements = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const { page = 1, limit = 10 } = req.query;

    if (!schoolId) return sendError(res, "Authorization error");

    let baseQuery = `
SELECT
a.*,u.first_name, u.last_name
FROM announcements a
 JOIN users  u
    ON a.user_id = u.id
WHERE a.school_id = $1
`;

    let countQuery = `
        SELECT COUNT(DISTINCT a.id) as total
        FROM announcements a
        WHERE a.school_id = $1
      `;

    const queryParams: any[] = [schoolId];
    let paramIndex = 2;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limitNum, offset);

    const countParams: any[] = [schoolId];
    let countParamIndex = 2;

    const countResult = await query(countQuery, countParams);
    const totalAnnouncements = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalAnnouncements / limitNum);

    const from = totalAnnouncements > 0 ? offset + 1 : 0;
    const to = Math.min(offset + limitNum, totalAnnouncements);

    const pagination = {
      total: totalAnnouncements,
      per_page: limitNum,
      current_page: pageNum,
      last_page: totalPages,
      from: from,
      to: to,
      // Keep your original structure for backward compatibility
      currentPage: pageNum,
      itemsPerPage: limitNum,
      totalItems: totalAnnouncements,
      totalPages: totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    };

    const result = await query(baseQuery, queryParams);
    // const res = await query(get)

    logger.info(result);

    const announcements = result.rows.map((announcement) => ({
      id: announcement.id,
      school_id: announcement.school_id,
      title: announcement.title,
      subject: announcement.subject,
      createdBy: {
        id: announcement.user_id,
        first_name: announcement.first_name,
        last_name: announcement.last_name,
      },
      created_at: announcement.created_at,
    }));

    logger.info(announcements);
    return sendSuccess(
      req,
      res,
      "Announcement fetched successfully",
      announcements,
      pagination,
      "announcements"
    );
  }
);

export const deleteAnnouncements = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = req.user?.schoolId;
    const { id } = req.params;

    if (!id) return sendError(res, "Id missing");

    const itExists = `
    SELECT * FROM announcements 
    WHERE id = $1
    `;

    const check = await query(itExists, [id]);
    if (!check) return sendError(res, "Not found");

    const result = await query(deleteAnnouncementQuery, [id]);
    sendSuccess(req, res, "Succesfuly deleted");
  }
);
