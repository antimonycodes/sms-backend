import jwt from "jsonwebtoken";
import { config } from "@/config";

interface UserPayload {
  id: string;
  email: string;
  role: string;
  school_id?: string;
}

export const generateAccessToken = (user: UserPayload): string => {
  return jwt.sign(user, config.JWT_ACCESS_SECRET, {
    expiresIn: config.ACCESS_TOKEN_EXPIRY, // e.g. "15m"
    subject: "accessApi",
  });
};

export const generateRefreshToken = (user: UserPayload): string => {
  return jwt.sign({ id: user.id }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.REFRESH_TOKEN_EXPIRY, // e.g. "7d"
    subject: "refreshToken",
  });
};
