import { authAxiosInstance } from "../config/axiosConfig.js";

// GET list of available ElevenLabs voices
export const getAIAgentVoices = async () => {
    const res = await authAxiosInstance.get("/ai-agent/voices");
    return res.data; // array of { voiceId, name, previewUrl, ... }
};

// GET saved AI agent config for current user
export const getAIAgentDetails = async () => {
    const res = await authAxiosInstance.get("/ai-agent");
    return res.data; // ai_agents row or null
};

// POST save voice + prompt
export const updateAIAgentDetails = async (data) => {
    // data = { voiceId, introductionPrompt }
    const res = await authAxiosInstance.post("/ai-agent", data);
    return res.data;
};

// POST generate preview audio — returns a Blob
export const generateAIAgentPreviewAudio = async ({ text, voiceId }) => {
    const res = await authAxiosInstance.post(
        "/ai-agent/preview-audio",
        { text, voiceId },
        { responseType: "blob" } // IMPORTANT: must be blob responseType
    );
    return res.data; // Blob — use URL.createObjectURL(blob)
};
