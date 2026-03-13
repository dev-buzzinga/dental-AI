
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

        const account_sid = data.account_sid;
        const auth_token = data.auth_token;
        const app_sid = data.app_sid;

        const api_key_sid = data.api_key_sid;
        const api_key_secret = data.api_key_secret;


        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;
        const VoiceResponse = twilio.twiml.VoiceResponse;
        // Access token for Twilio Programmable Voice JS SDK.
        // Must be created with Account SID, API Key SID, and API Key Secret.
        const token = new AccessToken(
            account_sid,           // AC... (same)
            data.api_key_sid,     // SK... ← new
            data.api_key_secret,  // secret ← new
            { identity: identity, ttl: 3600 }
        );

        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: app_sid,
            incomingAllow: true,
        });

        token.addGrant(voiceGrant);

        return res.status(200).json({
            success: true,
            message: "Token generated successfully",
            token: token.toJwt(),
        });
    }
    catch (error) {
        console.log("error==>", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}