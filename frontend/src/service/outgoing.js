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

const getCallDetail = async (call_sid) => {
    return await authAxiosInstance.get("/outgoing-call/call-detail", {
        params: { call_sid },
    });
};

const getRecording = async (stream_url) => {
    if (!stream_url) throw new Error("stream_url is required");
    // If stream_url is absolute, strip origin so authAxiosInstance can attach auth headers.
    let url = (() => {
        try {
            const u = new URL(stream_url);
            return `${u.pathname}${u.search}`;
        } catch {
            return stream_url;
        }
    })();

    // authAxiosInstance baseURL already ends with "/api"
    // so remove leading "/api" from path to avoid "/api/api/...".
    if (url.startsWith("/api/")) url = url.slice("/api".length);
    if (url === "/api") url = "/";

    return await authAxiosInstance.get(url, { responseType: "arraybuffer" });
};

export default {
    makeOutgoingCall,
    getCallLogs,
    getCallDetail,
    getRecording,
};
