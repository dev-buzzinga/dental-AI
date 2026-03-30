import axiosInstance, { authAxiosInstance } from "../config/axiosConfig";

// authenticated routes
export const getSchedulerConfig = async () => {
    const response = await authAxiosInstance.get("/scheduler/config/get");
    return response.data;
};

export const saveSchedulerConfig = async (payload) => {
    const response = await authAxiosInstance.post("/scheduler/config/save", payload);
    return response.data;
};


// public routes
export const getPublicSchedulerConfig = async (uniqueKey) => {
    const response = await axiosInstance.get(`/scheduler/config/get/${uniqueKey}`);
    return response.data;
};
export const getPublicAppointmentTypes = async (uniqueKey) => {
    const response = await axiosInstance.get(`/scheduler/appointment-types/get/${uniqueKey}`);
    return response.data;
};

export const getAvailableTimeSlots = async (uniqueKey, date) => {
    const response = await axiosInstance.get(`/scheduler/available-slots/get/${uniqueKey}?date=${date}`);
    return response.data;
};

export const createPublicAppointment = async (uniqueKey, payload) => {
    const response = await axiosInstance.post(`/scheduler/create-appointment/public/${uniqueKey}`, payload);
    return response.data;
};