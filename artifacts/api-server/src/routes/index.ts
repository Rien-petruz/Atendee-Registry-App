import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import attendeesRouter from "./attendees";
import settingsRouter from "./settings";
import emailRouter from "./email";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/attendees", attendeesRouter);
router.use("/settings", settingsRouter);
router.use("/email", emailRouter);

export default router;
