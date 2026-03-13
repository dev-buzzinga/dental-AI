import { supabase } from "../config/database.js";
import twilio from "twilio";
import { config } from "../config/env.js";

// Temporary store for incoming call data (same pattern as outgoing)
const callStore = new Map();
// { parentCallSid: { from, to, userId, initiatedAt } }

/**
 * POST /api/incoming-call/voice
 * Twilio hits this when a patient calls our Twilio number.
 * Looks up the user by phone number and returns TwiML to dial their browser client.
 */
export const incomingCallVoiceService = async (req, res) => {
    try {
        const { To, From, CallSid } = req.body;

        console.log("📞 Incoming call webhook =>", { To, From, CallSid });
        // return
        if (!To) {
            const VoiceResponse = twilio.twiml.VoiceResponse;
            const twiml = new VoiceResponse();
            twiml.say("Sorry, this number is not available.");
            res.type("text/xml");
            return res.send(twiml.toString());
        }

        // Look up practice_details where contact_information.phone matches the called number
        const { data: practiceData, error } = await supabase
            .from("practice_details")
            .select("user_id, contact_information")
            .eq("contact_information->>phone", To)
            .single();

        const VoiceResponse = twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();

        if (error || !practiceData) {
            console.log("❌ No user found for number:", To);
            twiml.say("Sorry, this number is not available.");
            res.type("text/xml");
            return res.send(twiml.toString());
        }

        const userId = practiceData.user_id;
        // console.log("✅ Found user for incoming call:", userId);

        // Save call info to callStore
        callStore.set(CallSid, {
            from: From,
            to: To,
            userId: userId,
            initiatedAt: new Date().toISOString(),
        });

        console.log("📞 Incoming callStore saved =>", callStore.get(CallSid));

        // Build TwiML to dial the user's browser client
        // statusCallback is on <Dial> tag because we are dialing a Client, not a Number
        const dial = twiml.dial({});

        dial.client(userId);

        const twimlString = twiml.toString();
        console.log("Incoming TwiML =>", twimlString);
        res.type("text/xml");
        return res.send(twimlString);

    } catch (error) {
        console.error("Error in incoming call voice service:", error);
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();
        twiml.say("An error occurred. Please try again later.");
        res.type("text/xml");
        return res.send(twiml.toString());
    }
};

/**
 * POST /api/incoming-call/status-callback
 * Handles status updates for incoming calls (same pattern as outgoing).
 */
export const incomingCallStatusCallbackService = async (req, res) => {
    try {
        const {
            CallSid,
            CallStatus,
            Direction,
            From,
            To,
            Timestamp,
            CallDuration,
            ParentCallSid,
        } = req.body;

        // Find the right record from callStore
        let parentCallSid, savedCall;

        if (ParentCallSid && callStore.has(ParentCallSid)) {
            // Child leg (outbound-dial to the Client)
            parentCallSid = ParentCallSid;
            savedCall = callStore.get(parentCallSid);
        } else if (callStore.has(CallSid)) {
            // Parent leg (inbound from caller)
            parentCallSid = CallSid;
            savedCall = callStore.get(parentCallSid);
        }

        const userId = savedCall?.userId;
        const fromNumber = From || savedCall?.from;
        const toNumber = To || savedCall?.to;

        console.log("Incoming call status callback =>", {
            CallSid,
            ParentCallSid,
            CallStatus,
            Direction,
            From: fromNumber,
            To: toNumber,
            UserId: userId,
            Timestamp,
        });

        // Only process the child leg (outbound-dial to Client) for DB updates
        if (Direction == "outbound-dial" || Direction == "outbound-api") {

            if (CallStatus == "ringing" || CallStatus == "initiated") {
                // Check if record already exists
                const { data: existing } = await supabase
                    .from("call_logs")
                    .select("id")
                    .eq("call_sid", parentCallSid)
                    .single();

                if (!existing) {
                    await supabase.from("call_logs").insert({
                        user_id: userId,
                        call_sid: parentCallSid,
                        child_call_sid: CallSid,
                        to_number: toNumber,       // Twilio number (our number)
                        from_number: fromNumber,    // Caller's number
                        status: "ringing",
                        created_at: new Date().toISOString(),
                    });
                    console.log("🔔 Incoming call - ringing record created");
                }

            } else if (CallStatus == "in-progress") {
                await supabase
                    .from("call_logs")
                    .update({
                        status: "in-progress",
                        started_at: new Date().toISOString(),
                    })
                    .eq("call_sid", parentCallSid);

                console.log("🟢 Incoming call answered! Timer started - UserId:", userId);
                // TODO: WebSocket → frontend timer start

            } else if (CallStatus == "no-answer" || CallStatus == "failed" || CallStatus == "busy") {
                await supabase
                    .from("call_logs")
                    .update({ status: CallStatus })
                    .eq("call_sid", parentCallSid);

                callStore.delete(parentCallSid);
                console.log("📵 Incoming call - no answer / failed - UserId:", userId);

            } else if (CallStatus == "completed") {
                await supabase
                    .from("call_logs")
                    .update({
                        status: "completed",
                        ended_at: new Date().toISOString(),
                        duration: CallDuration || 0,
                    })
                    .eq("call_sid", parentCallSid);

                callStore.delete(parentCallSid);
                console.log("🔴 Incoming call ended. Timer stop - UserId:", userId);
                // TODO: WebSocket → frontend timer stop
            }
        }

        return res.status(200).send("OK");

    } catch (error) {
        console.error("Error handling incoming call status callback:", error);
        return res.status(500).send("Error");
    }
};
