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
// { parentCallSid: { to, from, userId, callerId, childCallSid, initiatedAt } }

export const voiceResponseService = async (req, res) => {
    try {
        const { To, From, CallSid } = req.body;
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();

        if (To) {
            const user_id = From?.replace('client:', '');
            if (!user_id) throw new Error("User not found");

            const { data, error } = await supabase
                .from('practice_details')
                .select('*')
                .eq('user_id', user_id)
                .single();

            if (error || !data) throw new Error("Twilio config not found");

            const callerId = data.contact_information.phone;

            // ✅ Parent CallSid se save karo
            callStore.set(CallSid, {
                to: To,
                from: From,
                userId: user_id,
                callerId: callerId,
                childCallSid: null,         // baad mein outbound-dial se milega
                initiatedAt: new Date().toISOString()
            });

            console.log("📞 callStore saved ==>", callStore.get(CallSid));

            const dial = twiml.dial({ callerId });
            dial.number({
                statusCallbackEvent: 'initiated ringing answered completed',
                statusCallback: `${config.BASE_URL}/api/outgoing-call/status-callback`,
                statusCallbackMethod: 'POST'
            }, To);

        } else {
            twiml.say('No number provided');
        }

        const twimlString = twiml.toString();
        console.log("TwiML being sent ==>", twimlString);
        res.type('text/xml');
        return res.send(twimlString);

    } catch (error) {
        console.log("error ==>", error);
        return res.status(500).json({
            success: false,
            message: "Failed to voice response",
            error: error.message
        });
    }
};

export const callStatusCallbackService = async (req, res) => {
    try {
        const {
            CallSid,
            CallStatus,
            Direction,
            From,
            To,
            Timestamp,
            CallDuration,
            ParentCallSid  // ✅ Twilio ye automatically bhejta hai
        } = req.body;

        // ─── find right recode ─────────────────────────────────
        let parentCallSid, savedCall;

        if (Direction === 'inbound') {
            // Browser → Twilio leg —  parent 
            parentCallSid = CallSid;
            savedCall = callStore.get(parentCallSid);

        } else if (Direction === 'outbound-dial') {
            // Twilio → Phone leg — parent is different
            parentCallSid = ParentCallSid;
            savedCall = callStore.get(parentCallSid);

            // Child CallSid is the first time it is received, so save it
            if (savedCall && !savedCall.childCallSid) {
                savedCall.childCallSid = CallSid;
                callStore.set(parentCallSid, savedCall);
            }
        }

        const userId = savedCall?.userId;
        const toNumber = To || savedCall?.to;
        const fromNumber = From || savedCall?.from;

        console.log("Twilio call status callback =>", {
            CallSid,
            ParentCallSid,
            CallStatus,
            Direction,
            From: fromNumber,
            To: toNumber,
            UserId: userId,
            Timestamp,
        });

        // ─── DB store + Timer logic ─────────────────────────────
        if (Direction === 'outbound-dial') {

            if (CallStatus === 'ringing') {
                // ✅ New call record created
                await supabase.from('call_logs').insert({
                    user_id: userId,
                    call_sid: parentCallSid,
                    child_call_sid: CallSid,
                    to_number: toNumber,
                    from_number: fromNumber,
                    status: 'ringing',
                    created_at: new Date().toISOString()
                });
                console.log("🔔 Ringing - record created");

            } else if (CallStatus === 'in-progress') {
                // ✅ Call answered
                await supabase
                    .from('call_logs')
                    .update({
                        status: 'in-progress',
                        started_at: new Date().toISOString()
                    })
                    .eq('child_call_sid', CallSid);

                console.log("🟢 Call answered! Timer started - UserId:", userId);
                // TODO: WebSocket → frontend timer start

            } else if (CallStatus === 'no-answer' || CallStatus === 'failed') {
                await supabase
                    .from('call_logs')
                    .update({ status: CallStatus })
                    .eq('child_call_sid', CallSid);

                callStore.delete(parentCallSid);
                console.log("📵 No answer / Failed - UserId:", userId);

            } else if (CallStatus === 'completed') {
        
                await supabase
                    .from('call_logs')
                    .update({
                        status: 'completed',
                        ended_at: new Date().toISOString(),
                        duration: CallDuration || 0
                    })
                    .eq('child_call_sid', CallSid);

                callStore.delete(parentCallSid);
                console.log("🔴 Call ended. Timer band karo - UserId:", userId);
                // TODO: WebSocket → frontend timer stop
            }
        }

        return res.status(200).send("OK");

    } catch (error) {
        console.error("Error handling call status callback:", error);
        return res.status(500).send("Error");
    }
};
