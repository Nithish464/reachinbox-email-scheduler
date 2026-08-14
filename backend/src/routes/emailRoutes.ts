import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/requireAuth";
import {
  parseLeadsFile,
  scheduleEmails,
  listScheduled,
  listSent,
  listSenders,
} from "../controllers/emailController";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.use(requireAuth);

router.post("/leads/parse", upload.single("file"), parseLeadsFile);
router.post("/schedule", scheduleEmails);
router.get("/scheduled", listScheduled);
router.get("/sent", listSent);
router.get("/senders", listSenders);

export default router;
