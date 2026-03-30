import { authAxiosInstance } from "../config/axiosConfig";

export const getSchedulerConfig = async () => {
    const response = await authAxiosInstance.get("/scheduler/config/get");
    return response.data;
};

export const saveSchedulerConfig = async (payload) => {
    const response = await authAxiosInstance.post("/scheduler/config/save", payload);
    return response.data;
};

