import * as aiAgentService from "../services/ai-agent.service.js";

// GET /ai-agent/voices
export const getVoices = async (req, res) => {
    try {
        const voices = await aiAgentService.getAvailableVoices();
        return res.status(200).json(voices);
    } catch (error) {
        console.error("getVoices error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch voices" });
    }
};

// GET /ai-agent
export const getAgent = async (req, res) => {
    try {
        const userId = req.user.id;
        const agent = await aiAgentService.getAIAgent(userId);
        return res.status(200).json(agent); // null is fine — FE handles it
    } catch (error) {
        console.error("getAgent error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch AI agent" });
    }
};

// POST /ai-agent
export const saveAgent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { voiceId, introductionPrompt } = req.body;

        if (!voiceId || !introductionPrompt) {
            return res.status(400).json({ success: false, message: "voiceId and introductionPrompt are required" });
        }

        const agent = await aiAgentService.saveAIAgent(userId, voiceId, introductionPrompt);
        return res.status(200).json({ success: true, data: agent });
    } catch (error) {
        console.error("saveAgent error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to save AI agent" });
    }
};

// POST /ai-agent/preview-audio
export const previewAudio = async (req, res) => {
    try {
        const { voiceId, text } = req.body;

        if (!voiceId || !text) {
            return res.status(400).json({ success: false, message: "voiceId and text are required" });
        }

        const buffer = await aiAgentService.generatePreviewAudio(voiceId, text);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Disposition", 'inline; filename="preview.mp3"');
        return res.status(200).send(buffer);
    } catch (error) {
        console.error("previewAudio error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to generate preview audio" });
    }
};
