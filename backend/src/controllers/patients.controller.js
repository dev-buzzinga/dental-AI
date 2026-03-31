import * as patientsService from "../services/patients.service.js";

export const getOnePatient = async (req, res) => {
    try {
        return await patientsService.getOnePatientService(req, res);
    } catch (error) {
        console.error("getOnePatient controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to get one patient",
        });
    }
};

export const upcomingAppointment = async (req, res) => {
    try {
        return await patientsService.upcomingAppointmentService(req, res);
    } catch (error) {
        console.error("upcomingAppointment controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to get upcoming appointment",
        });
    }
};

export const historyAppointment = async (req, res) => {
    try {
        return await patientsService.historyAppointmentService(req, res);
    } catch (error) {
        console.error("historyAppointment controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to get history appointment",
        });
    }
};
