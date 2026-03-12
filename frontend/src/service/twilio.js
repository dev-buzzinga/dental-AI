
import { authAxiosInstance } from "../config/axiosConfig";

const getActiveNumbers = async () => {
    return await authAxiosInstance.get("/twilio/get-active-numbers");
};

export default {
    getActiveNumbers,
};