import { outgoingCall, voiceResponseService, callStatusCallbackService, getCallLogsService } from "../services/outgoingCall.service.js";

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