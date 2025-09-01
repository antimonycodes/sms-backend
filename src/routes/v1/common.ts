import {
  createAnnouncement,
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

export default router;
