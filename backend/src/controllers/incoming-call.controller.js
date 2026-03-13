import { incomingCallVoiceService, incomingCallStatusCallbackService } from "../services/incomingCall.service.js";

export const voiceResponse = async (req, res) => {
    try {
        return await incomingCallVoiceService(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};

export const callStatusCallback = async (req, res) => {
    try {
        return await incomingCallStatusCallbackService(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};