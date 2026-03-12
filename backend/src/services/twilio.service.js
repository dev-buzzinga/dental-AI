import { generateToken } from "../utils/generateToken.js";
import twilio from "twilio";
import { supabase } from "../config/database.js";
const getTwilioClient = async (user_id) => {
    try {
        const { data, error } = await supabase
            .from('twilio_config')
            .select('*')
            .eq('user_id', user_id)
            .single();
        if (error || !data) {
            throw new Error(error.message);
        }

        const accountSid = data.account_sid;
        const authToken = data.auth_token;
        const app_sid = data.app_sid;

        const client = twilio(accountSid, authToken);
        return client;
    } catch (error) {
        throw new Error(error.message);
    }
};
export const getTwilioActiveNumbers = async (req, res) => {
    try {
        const user_id = req.user.id;
        const client = await getTwilioClient(user_id);
        const data = await client.incomingPhoneNumbers.list();
        const numbers = data.map(num => num.phoneNumber);
        return res.status(200).json({
            success: true,
            message: "Active numbers fetched successfully",
            data: numbers
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const generateTwilioToken = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { identity } = req.body;

        if (!identity) {
            return res.status(400).json({
                success: false,
                message: "Identity is required",
            });
        }

        const { data, error } = await supabase
            .from('twilio_config')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (error || !data) {
            return res.status(400).json({
                success: false,
                message: "Twilio config not found",
            });
        }

        const accountSid = data.account_sid;
        const authToken = data.auth_token;
        const app_sid = data.app_sid;

        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;

        const token = new AccessToken(accountSid, identity, authToken);
        token.addGrant(new VoiceGrant({ outgoingApplicationSid: app_sid }));

        return res.status(200).json({
            success: true,
            message: "Token generated successfully",
            token: token.toJwt(),
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}