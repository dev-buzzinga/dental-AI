
import { authAxiosInstance } from "../config/axiosConfig";

const getActiveNumbers = async () => {
    return await authAxiosInstance.get("/twilio/get-active-numbers");
};

const generateTwilioToken = async (identity) => {
    return await authAxiosInstance.post("/twilio/generate/token", {
        identity,
    });
};

const setupWebhooks = async (phoneNumberSid = null) => {
    return await authAxiosInstance.post("/twilio/setup-webhooks", {
        phoneNumberSid,
    });
};

export default {
    getActiveNumbers,
    generateTwilioToken,
    setupWebhooks,
};