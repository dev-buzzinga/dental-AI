import { authAxiosInstance } from "../config/axiosConfig";

const makeOutgoingCall = async (to, from) => {
    return await authAxiosInstance.post("/outgoing-call/make-call", {
        to,
        from,
    });
};

const getCallLogs = async () => {
    return await authAxiosInstance.get("/outgoing-call/call-logs");
};

export default {
    makeOutgoingCall,
    getCallLogs,
};
