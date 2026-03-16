import * as aiScribeService from "../services/ai-scribe.service.js";

export const createAiScribe = async (req, res) => {
    try {
        const { user_id, patient_id, doctor_id, template_id, description, date_created } = req.body;

        if (!user_id || !patient_id || !doctor_id) {
            return res.status(400).json({
                success: false,
                message: "user_id, patient_id, and doctor_id are required",
            });
        }

        const result = await aiScribeService.createAiScribe({
            user_id,
            patient_id,
            doctor_id,
            template_id,
            description,
            date_created,
        });

        return res.status(201).json({
            success: true,
            data: result,
            message: "AI Scribe created successfully",
        });
    } catch (error) {
        console.error("Create AI Scribe error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create AI Scribe",
        });
    }
};

export const getAiScribeById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await aiScribeService.getAiScribeById(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "AI Scribe not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Get AI Scribe error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get AI Scribe",
        });
    }
};

export const getAiScribesByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await aiScribeService.getAiScribesByUser(userId);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Get AI Scribes error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get AI Scribes",
        });
    }
};

export const updateAiScribe = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const result = await aiScribeService.updateAiScribe(id, updates);

        return res.status(200).json({
            success: true,
            data: result,
            message: "AI Scribe updated successfully",
        });
    } catch (error) {
        console.error("Update AI Scribe error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update AI Scribe",
        });
    }
};

export const deleteAiScribe = async (req, res) => {
    try {
        const { id } = req.params;

        await aiScribeService.deleteAiScribe(id);

        return res.status(200).json({
            success: true,
            message: "AI Scribe deleted successfully",
        });
    } catch (error) {
        console.error("Delete AI Scribe error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete AI Scribe",
        });
    }
};

export const uploadAudio = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.files || !req.files.audio) {
            return res.status(400).json({
                success: false,
                message: "No audio file uploaded",
            });
        }

        const audioFile = req.files.audio;
        const duration = parseInt(req.body.duration || 0);

        const result = await aiScribeService.uploadAudio(id, audioFile, duration);

        return res.status(200).json({
            success: true,
            url: result.url,
            message: "Audio uploaded successfully",
        });
    } catch (error) {
        console.error("Upload audio error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to upload audio",
        });
    }
};

export const generateSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { transcript, patient_name, doctor_name, template } = req.body;

        if (!transcript) {
            return res.status(400).json({
                success: false,
                message: "Transcript is required",
            });
        }

        const result = await aiScribeService.generateSummary(id, {
            transcript,
            patient_name,
            doctor_name,
            template,
        });

        return res.status(200).json({
            success: true,
            data: result,
            message: "Summary generated successfully",
        });
    } catch (error) {
        console.error("Generate summary error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to generate summary",
        });
    }
};
