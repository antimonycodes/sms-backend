import { query } from "@/lib/db";
import {
  asyncHandler,
  sendError,
  sendValidationError,
  sendSuccess,
  sendServerError,
} from "@/utils/sendResponse";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  checkEmailExistsQuery,
  createSchoolQuery,
  createUserQuery,
  signinQuery,
} from "@/data/sqlQuery";
import { ensureDefaultClassLevels } from "../admin/classes";
import { ensureDefaultTermsService } from "../admin/terms";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { config } from "@/config";

// Single signin function for all user types
export const signinService = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password)
      return sendError(res, "Email and password are required");

    const result = await query(signinQuery, [email]);
    if (result.rows.length === 0)
      return sendError(res, "Invalid credentials", 401);

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendError(res, "Invalid credentials", 401);

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Optional: store refresh token in DB
    await query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
      refreshToken,
      user.id,
    ]);

    // Send refresh token as secure cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const data = {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        image: user.avatar_url,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
      },
      accessToken,
    };

    return sendSuccess(req, res, "Login successful", data, null, "user");
  }
);
export const refreshTokenService = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return sendError(res, "No refresh token", 401);

    try {
      const decoded: any = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);

      // Verify refresh token in DB
      const result = await query(
        "SELECT id, email, role, school_id FROM users WHERE id = $1 AND refresh_token = $2",
        [decoded.id, refreshToken]
      );

      if (result.rows.length === 0)
        return sendError(res, "Invalid refresh token", 403);

      const user = result.rows[0];
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        school_id: user.school_id,
      };

      //  new access token
      const newAccessToken = generateAccessToken(payload);

      return sendSuccess(
        req,
        res,
        "Token refreshed",
        newAccessToken,
        null,
        "accessToken"
      );
    } catch (err) {
      return sendError(res, "Invalid or expired refresh token", 403);
    }
  }
);

// School registration (creates school + admin user)
export const schoolSignupService = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      // School info
      name, // School name will be used for admin first_name too
      address,
      phone,
      email, // This will be both school email and admin email
      logo_url,
      subscription_plan = "basic",
      password, // Admin password
    } = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      // Start transaction
      await query("BEGIN");

      // 1. Create school
      const schoolResult = await query(createSchoolQuery, [
        name,
        address,
        phone,
        email,
        logo_url,
        subscription_plan,
      ]);

      const school = schoolResult.rows[0];

      //create class levels for school
      await ensureDefaultClassLevels(school.id);
      await ensureDefaultTermsService(school.id);

      // 2. Create admin user (using school name as first_name)
      const userResult = await query(createUserQuery, [
        school.id, // school_id
        name, // first_name (same as school name)
        "", // last_name (null for admin)
        email, // email (same as school email)
        hashedPassword,
        "admin", // role
        true, // is_active
      ]);

      const user = userResult.rows[0];

      await query("COMMIT");

      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          school_id: user.school_id,
        },
        process.env.JWT_ACCESS_SECRET as string,
        { expiresIn: "24h" }
      );

      // Format created_at date
      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      // Structure response to match your format
      const data = {
        user: {
          type: "User",
          id: user.id,
          attributes: {
            first_name: user.first_name, // This will be the school name
            last_name: user.last_name, // This will be null
            email: user.email,
            phone: phone,
            image: logo_url,
            role: user.role,
            is_active: true,
            school: {
              id: school.id,
              name: school.name,
              logo: school.logo_url,
              domain: null,
              subscription_plan: school.subscription_plan,
            },
            department: null,
            created_at: formatDate(user.created_at),
          },
        },
        token,
      };

      return sendSuccess(
        req,
        res,
        "School and admin account created successfully",
        data
      );
    } catch (error) {
      await query("ROLLBACK");
      console.error("School signup error:", error);
      return sendServerError(res);
    }
  }
);

// User signup (for teachers, students joining existing school)
export const userSignupService = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      schoolId, // Could come from subdomain, invite link, or selection
      firstName,
      lastName,
      email,
      password,
      phone,
      role, // 'teacher' or 'student'

      // Optional: additional info based on role
      employeeId, // for teachers
      department, // for teachers
      studentId, // for students
      gradeLevel, // for students
    } = req.body;

    // Validation
    if (!schoolId || !firstName || !lastName || !email || !password || !role) {
      return sendError(res, "All required fields must be provided");
    }

    if (!["teacher", "student"].includes(role)) {
      return sendError(res, "Invalid role. Must be 'teacher' or 'student'");
    }

    // Check if email already exists
    const emailCheck = await query(checkEmailExistsQuery, [email]);
    if (emailCheck.rows.length > 0) {
      return sendError(res, "Email already exists", 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      await query("BEGIN");

      // Create user
      const userResult = await query(createUserQuery, [
        schoolId,
        firstName,
        lastName,
        email,
        hashedPassword,
        role,
      ]);

      const user = userResult.rows[0];

      // Add role-specific information if provided
      if (role === "teacher" && (employeeId || department)) {
        await query(
          `INSERT INTO teachers (user_id, employee_id, department) VALUES ($1, $2, $3)`,
          [user.id, employeeId, department]
        );
      }

      if (role === "student" && (studentId || gradeLevel)) {
        await query(
          `INSERT INTO students (user_id, student_id, grade_level) VALUES ($1, $2, $3)`,
          [user.id, studentId, gradeLevel]
        );
      }

      await query("COMMIT");

      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          school_id: user.school_id,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "24h" }
      );

      // Get school info for response
      const schoolResult = await query(
        `SELECT name, logo_url, subscription_plan FROM schools WHERE id = $1`,
        [schoolId]
      );
      const school = schoolResult.rows[0];

      // Format created_at date
      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      // Structure response to match your format
      const data = {
        user: {
          type: "User",
          id: user.id,
          attributes: {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: phone,
            image: null,
            role: user.role,
            is_active: true,
            school: {
              id: user.school_id,
              name: school.name,
              logo: school.logo_url,
              domain: null,
              subscription_plan: school.subscription_plan,
            },
            department: department || null,
            created_at: formatDate(user.created_at),
          },
        },
        token,
      };

      return sendSuccess(
        req,
        res,
        `${role} account created successfully`,
        data
      );
    } catch (error) {
      await query("ROLLBACK");
      console.error("User signup error:", error);
      return sendError(res, "Failed to create user account", 500);
    }
  }
);

export const signoutService = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Invalidate refresh token in DB
      await query(
        "UPDATE users SET refresh_token = NULL WHERE refresh_token = $1",
        [refreshToken]
      );
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return sendSuccess(req, res, "Logged out successfully");
  }
);
