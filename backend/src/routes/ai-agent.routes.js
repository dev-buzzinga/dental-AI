import express from "express";
import * as aiAgentController from "../controllers/ai-agent.controller.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /ai-agent/voices — list of ElevenLabs voices
router.get("/voices", authenticateUser, aiAgentController.getVoices);

// GET /ai-agent — get saved config for current user
router.get("/", authenticateUser, aiAgentController.getAgent);

// POST /ai-agent — save voice + prompt
router.post("/", authenticateUser, aiAgentController.saveAgent);

// POST /ai-agent/preview-audio — stream TTS preview
router.post("/preview-audio", authenticateUser, aiAgentController.previewAudio);

export default router;
