
import { authAxiosInstance } from "../config/axiosConfig";

const connectGmail = async () => {
    return await authAxiosInstance.post("/gmail/connect");
};

const getGmailThreads = async () => {
    const response = await authAxiosInstance.get("/gmail/threads/list");
    return response.data;
};

const getReferralEmails = async () => {
    const response = await authAxiosInstance.get("/gmail/emails/referrals");
    return response.data;
};

const getThreadHistory = async (threadId) => {
    const response = await authAxiosInstance.get(`/gmail/threads/${threadId}/history`);
    return response.data;
};

const getAttachmentBlob = async (messageId, attachmentId) => {
    const response = await authAxiosInstance.get(
        `/gmail/messages/${messageId}/attachments/${attachmentId}`,
        { responseType: "blob" }
    );
    return response.data;
};

export default {
    connectGmail,
    getGmailThreads,
    getReferralEmails,
    getThreadHistory,
    getAttachmentBlob,
};
