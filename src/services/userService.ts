import pool from "@/lib/db";
import { User } from "@/types/auth.types";

export class UserService {
  // Find a user by their ID
  static async findById(userId: number): Promise<User | null> {
    try {
      const query = `
        SELECT 
          id, email, name, role, school_id as "schoolId", 
          is_active as "isActive", created_at as "createdAt"
        FROM users 
        WHERE id = $1 AND is_active = true
      `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error) {
      console.error("Error finding user:", error);
      throw new Error("Database error");
    }
  }

  // Find a user by their email (for login)
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT 
          id, email, name, role, school_id as "schoolId", 
          is_active as "isActive", created_at as "createdAt"
        FROM users 
        WHERE email = $1 AND is_active = true
      `;

      const result = await pool.query(query, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw new Error("Database error");
    }
  }
}
