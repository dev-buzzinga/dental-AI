import { generateTwilioToken, getTwilioActiveNumbers } from "../services/twilio.service.js";
import { setupWebhooksService } from "../services/twilioWebhookSetup.js";

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

export const getActiveNumbers = async (req, res) => {
    try {
        return await getTwilioActiveNumbers(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};

export const setupWebhooks = async (req, res) => {
    try {
        return await setupWebhooksService(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to setup webhooks",
            error: error.message,
        });
    }
};