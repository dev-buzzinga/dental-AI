import { authAxiosInstance } from "../config/axiosConfig";

export const getSchedulerConfig = async () => {
    const response = await authAxiosInstance.get("/scheduler/config");
    return response.data;
};

export const saveSchedulerConfig = async (payload) => {
    const response = await authAxiosInstance.post("/scheduler/config", payload);
    return response.data;
};

