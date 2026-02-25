import { incomingCall } from "../services/incomingCall.service.js"

export const makeIncomingCall = async (req, res) => {
    try {
        return await incomingCall(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};