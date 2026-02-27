import * as appointmentService from "../services/appointment.service.js";

export const connectGoogle = async (req, res) => {
    try {
        return await appointmentService.connectGoogle(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};

export const googleCallback = async (req, res) => {
    try {
        return await appointmentService.googleCallback(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};

export const createAppointment = async (req, res) => {
    try {
        return await appointmentService.createAppointment(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};