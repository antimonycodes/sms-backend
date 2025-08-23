// import { schoolSignupService } from "@/controller/v1/auth/signin";
import {
  createSchoolSession,
  deleteSession,
  getActiveSession,
  getAllSessions,
  updateSession,
} from "@/controller/v1/admin";
import { schoolSignupService } from "@/controller/v1/auth/signin";
import {
  requireAnyAuthenticated,
  requireSchoolAdmin,
  requireScopedSchoolAdmin,
} from "@/middlewares/auth";
import { schoolSignupValidation } from "@/middlewares/validateRequest";
import { Router } from "express";

const router = Router();

router.get("/see", (req, res) => {
  res.send("welcome");
  console.log("first");
});

router.post("/signup", schoolSignupValidation, schoolSignupService);
// routes/admin.ts
router.post("/session", requireScopedSchoolAdmin, createSchoolSession);
router.get("/sessions", requireAnyAuthenticated, getAllSessions);
router.get("/sessions/active", requireAnyAuthenticated, getActiveSession);
router.put("/sessions/:id", requireScopedSchoolAdmin, updateSession);
router.delete("/sessions/:id", requireScopedSchoolAdmin, deleteSession);
// router.patch(
//   "/sessions/:id/toggle",
//   requireScopedSchoolAdmin,
//   toggleSessionStatus
// );

// router.get("/students", authenticate());
export default router;
