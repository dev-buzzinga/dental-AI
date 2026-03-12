import { supabase } from "../config/database.js";
import twilio from "twilio";
import { config } from "../config/env.js";
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

// Upar file mein add karo - temporary store
const callStore = new Map();
// { CallSid: { to, from, userId, startTime } }

export const voiceResponseService = async (req, res) => {
    try {
        // console.log("req.body ==>", req.body);

        const { To, From, CallSid } = req.body; // ← CallSid bhi lo
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();

        if (To) {
            const user_id = From?.replace('client:', '');
            if (!user_id) {
                throw new Error("User not found");
            }

            const { data, error } = await supabase
                .from('practice_details')
                .select('*')
                .eq('user_id', user_id)
                .single();

            if (error || !data) {
                throw new Error("Twilio config not found");
            }

            const callerId = data.contact_information.phone;

            // ✅ CallSid ke saath details save karo
            callStore.set(CallSid, {
                to: To,
                from: From,
                userId: user_id,
                callerId: callerId,
                initiatedAt: new Date().toISOString()
            });

            // console.log("callStore saved ==>", callStore.get(CallSid));

            const dial = twiml.dial({
                callerId: callerId,
                statusCallback: `${config.BASE_URL}/outgoing/status-callback`,
                statusCallbackMethod: 'POST',
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
            });
            dial.number(To);
        } else {
            twiml.say('No number provided');
        }
        const twimlString = twiml.toString();
        console.log("TwiML being sent ==>", twimlString); 
        res.type('text/xml');
        return res.send(twimlString);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to voice response",
            error: error.message
        });
    }
};

export const callStatusCallbackService = async (req, res) => {
    try {
        const { CallSid, CallStatus, Direction, From, To, Timestamp } = req.body;

        // ✅ Store se real data lo
        const savedCall = callStore.get(CallSid);

        console.log("Twilio call status callback =>", {
            CallSid,
            CallStatus,
            Direction,
            From: From || savedCall?.from,      // ← actual value
            To: To || savedCall?.to,            // ← actual value
            UserId: savedCall?.userId,
            Timestamp,
        });

        // ✅ Timer logic - in-progress pe frontend notify karo
        if (CallStatus === 'in-progress') {
            console.log("🟢 Call answered! Timer shuru karo");
            // TODO: WebSocket se frontend ko notify karo
        }

        if (CallStatus === 'completed') {
            console.log("🔴 Call ended. Timer band karo");
            callStore.delete(CallSid); // ← cleanup
        }

        return res.status(200).send("OK");

    } catch (error) {
        console.error("Error handling call status callback:", error);
        return res.status(500).send("Error");
    }
};
