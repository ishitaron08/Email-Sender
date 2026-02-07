import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validateBody } from "../middleware/validate";
import {
  scheduleSchema,
  scheduleEmails,
  listScheduled,
  listSent,
  cancelDispatch,
  getRateLimitStatus,
} from "../controllers/email.controller";

const router = Router();

// All email routes require authentication
router.use(authenticate);

router.post("/schedule", validateBody(scheduleSchema), scheduleEmails);
router.get("/scheduled", listScheduled);
router.get("/sent", listSent);
router.patch("/:id/cancel", cancelDispatch);
router.get("/rate-limit", getRateLimitStatus);

export default router;
