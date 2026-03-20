
import twilio from "twilio";
import { supabase } from "../config/database.js";
import { setupTwilioWebhooks } from "./twilioWebhookSetup.js";

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
        // console.log("data==>", data);
        const numbers = data.map(num =>
        ({
            phoneNumber: num.phoneNumber,
            sid: num.sid,
            // friendlyName: num.friendlyName,
            // voiceUrl: num.voiceUrl,
            // statusCallback: num.statusCallback,
            // statusCallbackMethod: num.statusCallbackMethod,
        })
        );
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

/**
 * Helper function to trigger webhook setup after phone number changes
 * Can be called internally when user adds/changes phone number
 * @param {string} user_id - User ID
 * @param {string} phoneNumberSid - Phone Number SID (optional)
 * @returns {Promise<Object>} Setup result
 */
export const autoSetupWebhooksForUser = async (user_id, phoneNumberSid = null) => {
    try {
        console.log(`🔄 Auto-triggering webhook setup for user: ${user_id}`);
        const result = await setupTwilioWebhooks(user_id, phoneNumberSid);
        return result;
    } catch (error) {
        console.error("Error in autoSetupWebhooksForUser:", error);
        return {
            success: false,
            message: error.message,
        };
    }
};
