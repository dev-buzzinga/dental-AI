import { authAxiosInstance } from "../config/axiosConfig";

const getOnePatient = async (patient_id) => {
    return await authAxiosInstance.get("/patient/get-one-patient", {
        params: { patient_id },
    });
};

const upcomingAppointment = async (patient_id) => {
    return await authAxiosInstance.get("/patient/upcoming-appointment", {
        params: { patient_id },
    });
};

const historyAppointment = async (patient_id) => {
    return await authAxiosInstance.get("/patient/history-appointment", {
        params: { patient_id },
    });
};

export default {
    getOnePatient,
    upcomingAppointment,
    historyAppointment
};
