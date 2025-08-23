// src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthUser, UserRole } from "@/types/auth.types";
import { query } from "@/lib/db";

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  currentSchoolId?: number;
}

// Type guard for JWT payload
interface TokenPayload extends JwtPayload {
  id: number;
}

const isValidTokenPayload = (payload: any): payload is TokenPayload => {
  return (
    payload && typeof payload === "object" && typeof payload.id === "number"
  );
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authReq = req as AuthenticatedRequest;
  const authHeader = authReq.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization error" });
  }

  const token = authHeader.split(" ")[1];

  // Check if JWT secret is configured
  const jwtSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtSecret) {
    console.error("JWT_ACCESS_SECRET is not configured");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    // Validate the decoded payload structure
    if (!isValidTokenPayload(decoded)) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    // Fetch user role + schoolId directly from DB with error handling
    let result;
    try {
      result = await query(
        "SELECT id, role, school_id FROM users WHERE id = $1 LIMIT 1",
        [decoded.id]
      );
    } catch (dbError) {
      console.error("Database query error in authenticate:", dbError);
      return res.status(500).json({ message: "Database error" });
    }

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach enriched user object (trusted for the rest of the request)
    authReq.user = {
      id: user.id,
      role: user.role as UserRole,
      schoolId: user.school_id,
    };

    // Log only user ID for security (avoid logging sensitive data)
    console.log(
      `User authenticated: ID ${authReq.user.id}, Role: ${authReq.user.role}`
    );

    next();
  } catch (err) {
    console.error("authenticate error:", err);

    // Provide more specific error messages based on JWT error types
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    } else if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    }

    return res.status(401).json({ message: "Authentication failed" });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json({
        message: "Forbidden",
        required: roles,
        current: authReq.user.role,
      });
    }

    next();
  };
};

export const scopeToSchool = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user?.schoolId) {
    return res.status(400).json({ message: "No school assigned" });
  }

  authReq.currentSchoolId = authReq.user.schoolId;
  next();
};

// Pre-made combos
export const requireSuperAdmin = [
  authenticate,
  requireRole([UserRole.SUPER_ADMIN]),
];

export const requireSchoolAdmin = [
  authenticate,
  requireRole([UserRole.SCHOOL_ADMIN]),
];

export const requireTeacher = [authenticate, requireRole([UserRole.TEACHER])];

export const requireStudent = [authenticate, requireRole([UserRole.STUDENT])];

export const requireScopedSchoolAdmin = [
  authenticate,
  requireRole([UserRole.SCHOOL_ADMIN]),
  scopeToSchool,
];

// Additional helpful middleware for multi-role access
export const requireSchoolStaff = [
  authenticate,
  requireRole([UserRole.SCHOOL_ADMIN, UserRole.TEACHER]),
  scopeToSchool,
];

export const requireAnyAuthenticated = [authenticate];
