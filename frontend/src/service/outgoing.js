import { authAxiosInstance } from "../config/axiosConfig";

const makeOutgoingCall = async (to, from) => {
    return await authAxiosInstance.post("/outgoing/make-call", {
        to,
        from,
    });
};

export default {
    makeOutgoingCall,
};
