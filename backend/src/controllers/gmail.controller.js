import * as gmailService from "../services/gmail.service.js";

export const connectGmail = async (req, res) => {
    try {
        return await gmailService.connectGmail(req, res);
    } catch (error) {
        console.error("connectGmail controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to connect Gmail",
        });
    }
};

export const getReferralEmails = async (req, res) => {
    try {
        const userId = req.user.id;
        const threads = await gmailService.fetchReferralEmails(userId);
        return res.status(200).json({
            success: true,
            data: threads,
        });
    } catch (error) {
        console.error("getReferralEmails controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to fetch referral emails",
        });
    }
};

export const getGmailThreads = async (req, res) => {
    try {
        const userId = req.user.id;
        const threads = await gmailService.listGmailThreads(userId);
        return res.status(200).json({
            success: true,
            data: threads,
        });
    } catch (error) {
        console.error("getGmailThreads controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to fetch gmail threads",
        });
    }
};

export const getThreadHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { threadId } = req.params;
        if (!threadId) {
            return res.status(400).json({
                success: false,
                message: "threadId is required",
            });
        }
        const result = await gmailService.getThreadHistory(userId, threadId);
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("getThreadHistory controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to fetch thread history",
        });
    }
};

export const getAttachment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;
        const { filename } = req.query;
        if (!messageId || !filename) {
            return res.status(400).json({
                success: false,
                message: "messageId and filename are required",
            });
        }
        const { data, filename: fname, mimeType } = await gmailService.getAttachment(
            userId,
            messageId,
            filename
        );
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Attachment not found",
            });
        }
        const buffer = Buffer.from(data, "base64");
        res.setHeader("Content-Type", mimeType || "application/octet-stream");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${encodeURIComponent(fname || "attachment")}"`
        );
        return res.send(buffer);
    } catch (error) {
        console.error("getAttachment controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to fetch attachment",
        });
    }
};

export const sendReply = async (req, res) => {
    try {
        const userId = req.user.id;
        const { threadId } = req.params;
        const { body = "", attachments = [] } = req.body;

        if (!threadId) {
            return res.status(400).json({
                success: false,
                message: "threadId is required",
            });
        }

        const result = await gmailService.sendReply(userId, threadId, {
            body: typeof body === "string" ? body : "",
            attachments: Array.isArray(attachments) ? attachments : [],
        });

        return res.status(200).json({
            success: true,
            data: result,
            message: "Reply sent successfully",
        });
    } catch (error) {
        console.error("sendReply controller error:", error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Failed to send reply",
        });
    }
};
