import express from "express";
import * as aiScribeController from "../controllers/ai-scribe.controller.js";

const router = express.Router();

// Create new AI scribe record
// router.post("/", aiScribeController.createAiScribe);

// Generate AI summary preview (without voiceNoteId)
router.post("/generate-summary-preview", aiScribeController.generateSummaryPreview);

// Save complete voice note (new - called from Save Note button)
router.post("/save-complete", aiScribeController.saveCompleteVoiceNote);

// Get AI scribe by ID
router.get("/:id", aiScribeController.getAiScribeById);

// Get all AI scribes for a user
router.get("/user/:userId", aiScribeController.getAiScribesByUser);

// Update AI scribe
router.put("/:id", aiScribeController.updateAiScribe);

// Delete AI scribe
router.delete("/:id", aiScribeController.deleteAiScribe);

// Upload audio file
router.post("/:id/audio", aiScribeController.uploadAudio);

// Generate AI summary
// router.post("/:id/summarize", aiScribeController.generateSummary);

export default router;
