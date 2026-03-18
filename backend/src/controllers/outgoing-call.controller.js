import { outgoingCall, voiceResponseService, callStatusCallbackService, getCallLogsService, getCallDetailService, getRecordingService, recordingCallbackService, transcriptionCallbackService, transcriptionCallbackServicePost} from "../services/outgoingCall.service.js";

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
export const getCallDetail = async (req, res) => {
    try {
        return await getCallDetailService(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};
export const getRecording = async (req, res) => {
    try {
        return await getRecordingService(req, res);
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