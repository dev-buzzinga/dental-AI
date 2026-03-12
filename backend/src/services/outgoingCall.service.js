import { supabase } from "../config/database.js";
import twilio from "twilio";

// Get Twilio client for this user
const getTwilioClient = async (user_id) => {
    try {
        const { data, error } = await supabase
            .from('twilio_config')
            .select('*')
            .eq('user_id', user_id)
            .single();
        if (error || !data) {
            throw new Error("Twilio config not found");
        }

        const accountSid = data.account_sid;
        const authToken = data.auth_token;

        const client = twilio(accountSid, authToken);
        return client;
    } catch (error) {
        throw new Error(error.message);
    }
};

export const outgoingCall = async (req, res) => {
    try {
        const { to, from } = req.body;
        const user_id = req.user?.id;

        if (!to || !from) {
            return res.status(400).json({
                success: false,
                message: "Missing 'to' or 'from' phone number",
            });
        }

        // For outgoing calls via Twilio Client JS SDK
        // This endpoint just validates and returns success
        // The actual call is initiated from frontend using the access token
        return res.status(200).json({
            success: true,
            message: "Outgoing call initiated successfully",
            callData: {
                to,
                from,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to initiate outgoing call",
            error: error.message
        });
    }
};
