import { _findDoctor, _findDoctorsSlots, _initInformation, _updateIntent, _findAppointment, _bookAppointment } from "../services/vapi.service.js";


export const findDoctor = async (req, res) => {
    try {
        return await _findDoctor(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};
export const findDoctorsSlots = async (req, res) => {
    try {
        return await _findDoctorsSlots(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};

export const initInformation = async (req, res) => {
    try {
        return await _initInformation(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};
export const updateIntent = async (req, res) => {
    try {
        return await _updateIntent(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};
export const findAppointment = async (req, res) => {
    try {
        return await _findAppointment(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};

export const bookAppointment = async (req, res) => {
    try {
        return await _bookAppointment(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        });
    }
};