
import { authAxiosInstance } from "../config/axiosConfig";

const connectGmail = async () => {
    return await authAxiosInstance.post("/gmail/connect");
};

export default {
    connectGmail,
};
