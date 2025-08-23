export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  schoolId?: number; // Optional because super admin doesn't belong to a school
  isActive: boolean;
  createdAt: Date;
}

// roles
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  SCHOOL_ADMIN = "admin",
  SUB_ADMIN = "sub_admin",
  TEACHER = "teacher",
  STUDENT = "student",
}

// What each role can do (like permissions on your phone apps)
export enum Permission {
  // System level (only super admin)
  MANAGE_SYSTEM = "manage_system",
  CREATE_SCHOOLS = "create_schools",

  // School management
  MANAGE_SCHOOL = "manage_school",
  MANAGE_USERS = "manage_users",

  // Academic stuff
  MANAGE_CLASSES = "manage_classes",
  MANAGE_GRADES = "manage_grades",
  VIEW_GRADES = "view_grades",
  MANAGE_ATTENDANCE = "manage_attendance",
  VIEW_ATTENDANCE = "view_attendance",
}

// What's in our JWT token
export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  schoolId?: number;
}

export interface AuthUser {
  id: number;
  role: UserRole;
  schoolId?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  currentSchoolId?: number;
}
