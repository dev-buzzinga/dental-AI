import { generateTwilioToken } from "../services/twilioToken.service.js";

export const generateToken = async (req, res) => {
    try {
        return await generateTwilioToken(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};