import { AuthenticatedRequest } from "@/middlewares/auth";
import {
  sendSuccess,
  sendServerError,
  sendPaginatedSuccess,
  createPaginationResponse,
  calculatePagination,
} from "@/utils/sendResponse";
import { query } from "@/lib/db";
import { Response } from "express";
import {
  createSessionQuery,
  deactivateSessionQuery,
  getActiveSessionQuery,
  getAllSessionsQuery,
  deleteSessionQuery,
} from "@/data/admin.queries";

// Create Session (your existing code - keeping it as is)
export const createSchoolSession = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const {
    sessionId,
    sessionName,
    startDate,
    endDate,
    isActive = true,
  } = req.body;
  const schoolId = req.user?.schoolId || req.currentSchoolId;

  if (!sessionName || !startDate || !endDate) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid date format." });
  }

  if (start >= end) {
    return res
      .status(400)
      .json({ success: false, message: "Start date must be before end date." });
  }

  try {
    // Check if session name already exists for this school
    const nameCheck = await query(
      "SELECT id FROM school_sessions WHERE school_id = $1 AND session_name = $2 LIMIT 1",
      [schoolId, sessionName]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Session ${sessionName} already exists. Please choose a different name.`,
      });
    }

    await query("BEGIN");

    // Deactivate existing active sessions
    await query(deactivateSessionQuery, [schoolId]);

    // Create new session
    const result = await query(createSessionQuery, [
      schoolId,
      sessionName,
      startDate,
      endDate,
      isActive,
    ]);

    await query("COMMIT");

    return sendSuccess(res, "Session created successfully", result.rows[0]);
  } catch (error) {
    await query("ROLLBACK");
    console.error("Error creating session:", error);
    return sendServerError(res, "Failed to create session. Please try again.");
  }
};

// Get All Sessions
export const getAllSessions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const schoolId = req.user?.schoolId || req.currentSchoolId;

  // Extract pagination parameters from query string
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    // First, get the total count of sessions for this school
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM school_sessions
      WHERE school_id = $1
    `;
    const countResult = await query(countQuery, [schoolId]);
    const totalItems = parseInt(countResult.rows[0].total);

    // Calculate pagination details
    const pagination = calculatePagination(page, limit, totalItems);

    // Get paginated sessions
    const paginatedQuery = `
      ${getAllSessionsQuery}
      LIMIT $2 OFFSET $3
    `;

    const result = await query(paginatedQuery, [
      schoolId,
      pagination.itemsPerPage,
      pagination.offset,
    ]);

    // Create pagination info for response
    const paginationInfo = createPaginationResponse(page, limit, totalItems);

    // Option 1: Using sendPaginatedSuccess (cleaner)
    return sendPaginatedSuccess(
      res,
      "Sessions retrieved successfully",
      {
        sessions: result.rows,
      },
      {
        currentPage: paginationInfo.currentPage,
        totalPages: paginationInfo.totalPages,
        totalItems: paginationInfo.totalItems,
        itemsPerPage: paginationInfo.itemsPerPage,
      }
    );

    // Option 2: Using sendSuccess with pagination parameter
    /* 
    return sendSuccess(
      res,
      "Sessions retrieved successfully",
      { sessions: result.rows },
      200,
      paginationInfo
    );
    */
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return sendServerError(
      res,
      "Failed to retrieve sessions. Please try again."
    );
  }
};
// Get Active Session
export const getActiveSession = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const schoolId = req.user?.schoolId || req.currentSchoolId;

  if (!schoolId) {
    return res
      .status(400)
      .json({ success: false, message: "No school assigned to user." });
  }

  try {
    const result = await query(getActiveSessionQuery, [schoolId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active session found for this school.",
      });
    }

    return sendSuccess(
      res,
      "Active session retrieved successfully",
      result.rows[0]
    );
  } catch (error) {
    console.error("Error fetching active session:", error);
    return sendServerError(
      res,
      "Failed to retrieve active session. Please try again."
    );
  }
};

// Update Session
export const updateSession = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.params;
  const { sessionName, startDate, endDate } = req.body;
  const schoolId = req.user?.schoolId || req.currentSchoolId;

  if (!schoolId) {
    return res
      .status(400)
      .json({ success: false, message: "No school assigned to user." });
  }

  if (!sessionName || !startDate || !endDate) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid date format." });
  }

  if (start >= end) {
    return res
      .status(400)
      .json({ success: false, message: "Start date must be before end date." });
  }

  try {
    // Check if session exists and belongs to this school
    const sessionCheck = await query(
      "SELECT id FROM school_sessions WHERE id = $1 AND school_id = $2 LIMIT 1",
      [id, schoolId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found or you don't have permission to update it.",
      });
    }

    // Check if new name conflicts with existing sessions (excluding current session)
    const nameCheck = await query(
      "SELECT id FROM school_sessions WHERE school_id = $1 AND session_name = $2 AND id != $3 LIMIT 1",
      [schoolId, sessionName, id]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Session ${sessionName} already exists. Please choose a different name.`,
      });
    }

    // Update the session
    const result = await query(
      `UPDATE school_sessions 
       SET session_name = $1, start_date = $2, end_date = $3, updated_at = NOW()
       WHERE id = $4 AND school_id = $5 
       RETURNING *`,
      [sessionName, startDate, endDate, id, schoolId]
    );

    return sendSuccess(res, "Session updated successfully", result.rows[0]);
  } catch (error) {
    console.error("Error updating session:", error);
    return sendServerError(res, "Failed to update session. Please try again.");
  }
};

// Delete Session
export const deleteSession = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.params;
  const schoolId = req.user?.schoolId || req.currentSchoolId;

  if (!schoolId) {
    return res
      .status(400)
      .json({ success: false, message: "No school assigned to user." });
  }

  try {
    // Check if session exists and belongs to this school
    const sessionCheck = await query(
      "SELECT id, session_name, is_active FROM school_sessions WHERE id = $1 AND school_id = $2 LIMIT 1",
      [id, schoolId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found or you don't have permission to delete it.",
      });
    }

    const session = sessionCheck.rows[0];

    // Prevent deletion of active session
    if (session.is_active) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete active session. Please deactivate it first.",
      });
    }

    // Delete the session
    const result = await query(deleteSessionQuery, [id, schoolId]);

    return sendSuccess(res, "Session deleted successfully", {
      deletedSession: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    return sendServerError(res, "Failed to delete session. Please try again.");
  }
};

// Activate/Deactivate Session
export const toggleSessionStatus = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const schoolId = req.user?.schoolId || req.currentSchoolId;

  if (!schoolId) {
    return res
      .status(400)
      .json({ success: false, message: "No school assigned to user." });
  }

  if (typeof isActive !== "boolean") {
    return res
      .status(400)
      .json({ success: false, message: "isActive must be true or false." });
  }

  try {
    // Check if session exists and belongs to this school
    const sessionCheck = await query(
      "SELECT id, session_name FROM school_sessions WHERE id = $1 AND school_id = $2 LIMIT 1",
      [id, schoolId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found or you don't have permission to modify it.",
      });
    }

    await query("BEGIN");

    // If activating this session, deactivate all others first
    if (isActive) {
      await query(deactivateSessionQuery, [schoolId]);
    }

    // Update the specific session
    const result = await query(
      `UPDATE school_sessions 
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND school_id = $3 
       RETURNING *`,
      [isActive, id, schoolId]
    );

    await query("COMMIT");

    const action = isActive ? "activated" : "deactivated";
    return sendSuccess(res, `Session ${action} successfully`, result.rows[0]);
  } catch (error) {
    await query("ROLLBACK");
    console.error("Error toggling session status:", error);
    return sendServerError(
      res,
      "Failed to update session status. Please try again."
    );
  }
};
