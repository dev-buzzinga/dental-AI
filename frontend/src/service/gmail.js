
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

const getAttachmentBlob = async (messageId, filename) => {
    const response = await authAxiosInstance.get(
        `/gmail/messages/${messageId}/attachment`,
        {
            params: { filename },
            responseType: "blob"
        }
    );
    return response.data;
};

/**
 * Send reply in a thread. attachments: [{ filename, content: base64, mimeType }].
 */
const sendReply = async (threadId, { body, attachments = [] }) => {
    const response = await authAxiosInstance.post(
        `/gmail/threads/${threadId}/reply`,
        { body, attachments }
    );
    return response.data;
};

export default {
    connectGmail,
    getGmailThreads,
    getReferralEmails,
    getThreadHistory,
    getAttachmentBlob,
    sendReply,
};
