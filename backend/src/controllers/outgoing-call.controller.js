import { outgoingCall, voiceResponseService, callStatusCallbackService, getCallLogsService, recordingCallbackService, transcriptionCallbackService, transcriptionCallbackServicePost} from "../services/outgoingCall.service.js";

export const makeOutgoingCall = async (req, res) => {
    try {
        return await outgoingCall(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};
export const voiceResponse = async (req, res) => {
    try {
        return await voiceResponseService(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};

export const callStatusCallback = async (req, res) => {
    try {
        return await callStatusCallbackService(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};
export const getCallLogs = async (req, res) => {
    try {
        return await getCallLogsService(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};
export const recordingCallback = async (req, res) => {
    try {
        return await recordingCallbackService(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};
export const transcriptionCallback = async (req, res) => {
    try {
        return await transcriptionCallbackService(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};
export const transcriptionCallbackPost = async (req, res) => {
    try {
        return await transcriptionCallbackServicePost(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};