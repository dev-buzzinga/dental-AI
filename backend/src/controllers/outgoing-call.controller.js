import { outgoingCall } from "../services/outgoingCall.service.js";

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