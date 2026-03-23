import express from "express";
import twilioRoutes from "./twilio.routes.js";
import outgoingCallRoutes from "./outgoing.routes.js";
import incomingCallRoutes from "./incoming.routes.js";
import appointmentRoutes from "./appointment.routes.js";
import gmailRoutes from "./gmail.routes.js";
import aiScribeRoutes from "./ai-scribe.routes.js";
import periodontalChartRoutes from "./periodontalChart.routes.js";


const router = express.Router();

router.use("/twilio", twilioRoutes);
router.use("/outgoing-call", outgoingCallRoutes);
router.use("/incoming-call", incomingCallRoutes);
router.use("/appointment", appointmentRoutes);
router.use("/gmail", gmailRoutes);
router.use("/ai-scribe", aiScribeRoutes);
router.use("/periodontal-charts", periodontalChartRoutes);
export default router;
