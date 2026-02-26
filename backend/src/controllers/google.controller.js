import * as googleService from "../services/google.service.js";

export const connectGoogle = async (req, res) => {
    try {
        return await googleService.connectGoogle(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};

export const googleCallback = async (req, res) => {
    try {
        return await googleService.googleCallback(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};