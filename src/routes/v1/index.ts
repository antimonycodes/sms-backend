import { timeStamp } from "console";
import { Router } from "express";

const router = Router();

import adminRoutes from "./admin";
import authRoutes from "./auth";
import commonRoutes from "./common";

import { createSchoolService } from "../../controller/v1/index";
import { signoutService } from "@/controller/v1/auth/signin";
// import pool from "@/lib/db";

// routes
router.post("/", createSchoolService);

// / Make DB pool available to routes
router.use((req, res, next) => {
  //   req.db
  next();
});
// Routes
// Before routes
router.use((req, res, next) => {
  console.log(`Incoming: ${req.method} ${req.originalUrl}`);
  console.log(req.body);
  next();
});

router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/", commonRoutes);

export default router;
