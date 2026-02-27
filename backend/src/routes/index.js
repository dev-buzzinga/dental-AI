import express from "express";
import twilioTokenRoutes from "./twilioToken.routes.js";
import outgoingCallRoutes from "./outgoing.routes.js";
import incomingCallRoutes from "./incoming.routes.js";
import appointmentRoutes from "./appointment.routes.js";

const router = express.Router();

router.use("/twilio/token", twilioTokenRoutes);
router.use("/outgoing-call", outgoingCallRoutes);
router.use("/incoming-call", incomingCallRoutes);
router.use("/appointment", appointmentRoutes);

export default router;
