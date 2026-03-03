import * as gmailService from "../services/gmail.service.js";

export const connectGmail = async (req, res) => {
    try {
        return await gmailService.connectGmail(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};

export const gmailCallback = async (req, res) => {
    try {
        return await gmailService.gmailCallback(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};