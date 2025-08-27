import {
  refreshTokenService,
  signinService,
  signoutService,
} from "@/controller/v1/auth/signin";
import { Router } from "express";

const router = Router();

router.post("/signin", signinService);
router.post("/signout", signoutService);
router.post("/refresh-token", refreshTokenService);

export default router;
