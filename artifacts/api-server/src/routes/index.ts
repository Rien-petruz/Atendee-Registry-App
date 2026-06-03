import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import attendeesRouter from "./attendees.js";
import settingsRouter from "./settings.js";
import emailRouter from "./email.js";
import smsRouter from "./sms.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/attendees", attendeesRouter);
router.use("/settings", settingsRouter);
router.use("/email", emailRouter);
router.use("/sms", smsRouter);

export default router;
