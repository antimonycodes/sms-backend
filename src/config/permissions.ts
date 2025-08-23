import { Permission, UserRole } from "@/types/auth.types";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Super admin can do EVERYTHING
  [UserRole.SUPER_ADMIN]: Object.values(Permission),

  // School admin can manage their school
  [UserRole.SCHOOL_ADMIN]: [
    Permission.MANAGE_SCHOOL,
    Permission.MANAGE_USERS,
    Permission.MANAGE_CLASSES,
    Permission.MANAGE_GRADES,
    Permission.VIEW_GRADES,
    Permission.MANAGE_ATTENDANCE,
    Permission.VIEW_ATTENDANCE,
  ],

  // Sub admin has limited powers
  [UserRole.SUB_ADMIN]: [
    Permission.MANAGE_CLASSES,
    Permission.MANAGE_GRADES,
    Permission.VIEW_GRADES,
    Permission.MANAGE_ATTENDANCE,
    Permission.VIEW_ATTENDANCE,
  ],

  // Teacher can manage their classes
  [UserRole.TEACHER]: [
    Permission.MANAGE_GRADES,
    Permission.VIEW_GRADES,
    Permission.MANAGE_ATTENDANCE,
    Permission.VIEW_ATTENDANCE,
  ],

  // Student can only view their own stuff
  [UserRole.STUDENT]: [Permission.VIEW_GRADES, Permission.VIEW_ATTENDANCE],
};

// Helper function: Does this user have this permission?
export const hasPermission = (
  userRole: UserRole,
  permission: Permission
): boolean => {
  return ROLE_PERMISSIONS[userRole].includes(permission);
};
