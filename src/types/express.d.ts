import { UserRole } from "../middlewares/auth.types";

declare global {
  namespace Express {
    interface User {
      id: number;
      //   email: string;
      role: UserRole;
      schoolId?: number;
    }

    interface Request {
      user?: User;
      currentSchoolId?: number;
    }
  }
}

export {};
