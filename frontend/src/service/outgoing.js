import { authAxiosInstance } from "../config/axiosConfig";

const makeOutgoingCall = async (to, from) => {
    return await authAxiosInstance.post("/outgoing-call/make-call", {
        to,
        from,
    });
};

export default {
    makeOutgoingCall,
};
