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
