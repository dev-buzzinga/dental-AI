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

export const getPatientInsurance = async (req, res) => {
    try {
        return await patientsService.getPatientInsuranceService(req, res);
    } catch (error) {
        console.error("getPatientInsurance controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to get patient insurance",
        });
    }
};

export const upsertPatientInsurance = async (req, res) => {
    try {
        return await patientsService.upsertPatientInsuranceService(req, res);
    } catch (error) {
        console.error("upsertPatientInsurance controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to save patient insurance",
        });
    }
};
