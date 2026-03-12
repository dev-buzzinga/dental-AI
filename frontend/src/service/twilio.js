
import { authAxiosInstance } from "../config/axiosConfig";

const getActiveNumbers = async () => {
    return await authAxiosInstance.get("/twilio/get-active-numbers");
};

const generateTwilioToken = async (identity) => {
    return await authAxiosInstance.post("/twilio/generate/token", {
        identity,
    });
};

export default {
    getActiveNumbers,
    generateTwilioToken,
};