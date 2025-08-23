import { signinService } from "@/controller/v1/auth/signin";
import { Router } from "express";

const router = Router();

router.post("/signin", signinService);

export default router;
