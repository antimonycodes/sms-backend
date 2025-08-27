// import { schoolSignupService } from "@/controller/v1/auth/signin";
import {
  createClassArmService,
  deleteClassArmService,
  getAllClassArmsService,
  getAllClassLevelService,
  updateClassArmService,
} from "@/controller/v1/admin/classes";
import {
  createSchoolSession,
  deleteSession,
  getActiveSession,
  getAllSessions,
  updateSession,
} from "@/controller/v1/admin/sessions";
import {
  createStudentService,
  deleteStudentService,
  getAllStudentsService,
  getSingleStudentService,
  updateStudentService,
} from "@/controller/v1/admin/student";
import {
  createSubjectService,
  deleteSubjectService,
  editSubjectService,
  getAllSubjectsService,
} from "@/controller/v1/admin/subjects";
import {
  createTeacherService,
  deleteTeacherService,
  getAllTeachersService,
  getTeacherService,
  updateTeacherService,
} from "@/controller/v1/admin/teachers";
import {
  activateTermService,
  createTermService,
  getActiveTermService,
  getAllTermsService,
} from "@/controller/v1/admin/terms";
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
//sessions
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

//Terms
router.post("/terms", requireScopedSchoolAdmin, createTermService);
router.get("/terms", requireAnyAuthenticated, getAllTermsService);
router.get("/terms/active", requireAnyAuthenticated, getActiveTermService);
router.put(
  "/terms/:termId/activate",
  requireScopedSchoolAdmin,
  activateTermService
);
// router.delete("/terms/:id", requireScopedSchoolAdmin, deactivateTermService);

//classes
// router.post("/classes", requireScopedSchoolAdmin, createClassLevelService);
router.get("/classes", requireAnyAuthenticated, getAllClassLevelService);
router.post("/classes/arms", requireScopedSchoolAdmin, createClassArmService);
router.put(
  "/classes/arms/:id",
  requireScopedSchoolAdmin,
  updateClassArmService
);
router.delete(
  "/classes/arms/:id",
  requireScopedSchoolAdmin,
  deleteClassArmService
);
router.get("/classes/arms", requireAnyAuthenticated, getAllClassArmsService);

//SUBJECTS
router.post("/subjects", requireScopedSchoolAdmin, createSubjectService);
router.get("/subjects", requireAnyAuthenticated, getAllSubjectsService);
router.put("/subjects/:id", requireScopedSchoolAdmin, editSubjectService);
router.delete("/subjects/:id", requireScopedSchoolAdmin, deleteSubjectService);

// TEACHERS
router.post("/teachers", requireScopedSchoolAdmin, createTeacherService);
router.get("/teachers", requireAnyAuthenticated, getAllTeachersService);
router.get("/teachers/:teacherId", requireAnyAuthenticated, getTeacherService);
router.put(
  "/teachers/:teacherId",
  requireScopedSchoolAdmin,
  updateTeacherService
);
router.delete(
  "/teachers/:teacherId",
  requireScopedSchoolAdmin,
  deleteTeacherService
);

router.post("/students", requireScopedSchoolAdmin, createStudentService);
router.get("/students", requireAnyAuthenticated, getAllStudentsService);
router.get(
  "/students/:studentId",
  requireAnyAuthenticated,
  getSingleStudentService
);
router.put(
  "/students/:studentId",
  requireScopedSchoolAdmin,
  updateStudentService
);
router.delete(
  "/students/:studentId",
  requireScopedSchoolAdmin,
  deleteStudentService
);

// router.get("/students", authenticate());
export default router;
