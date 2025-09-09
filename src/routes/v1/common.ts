import {
  getClassArmStatsService,
  getStudentsByClassIdService,
} from "@/controller/v1/admin/classes";
import {
  createAnnouncement,
  createBoard,
  deleteAnnouncements,
  getAnnouncements,
} from "@/controller/v1/shared/announvement";
import {
  requireAnyAuthenticated,
  requireSchoolStaff,
} from "@/middlewares/auth";
import { Router } from "express";

const router = Router();

router.post("/announcement", requireAnyAuthenticated, createAnnouncement);
router.get("/announcement", requireSchoolStaff, getAnnouncements);
router.delete("/announcement/:id", requireSchoolStaff, deleteAnnouncements);
router.get(
  "/classarm/students/:classArmId",
  requireAnyAuthenticated,
  getStudentsByClassIdService
);
router.get(
  "/classarm/stats/:classArmId",
  requireAnyAuthenticated,
  getClassArmStatsService
);
export default router;
