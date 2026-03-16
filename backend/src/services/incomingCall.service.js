import { supabase } from "../config/database.js";
import twilio from "twilio";
import { config } from "../config/env.js";
import fs from "fs";
import path from "path";

// CSV helpers (same structure as outgoing, but upsert key = call_sid)
const callLogsCsvPath = path.join(process.cwd(), "call_logs.csv");
const CALL_LOGS_HEADER = [
    "user_id",
    "patients_name",
    "call_sid",
    "child_call_sid",
    "to_number",
    "from_number",
    "status",
    "direction",
    "timestamp",
    "created_at",
    "started_at",
    "ended_at",
    "duration"
];

const ensureCallLogsCsvHeader = () => {
    if (!fs.existsSync(callLogsCsvPath)) {
        const headerLine = CALL_LOGS_HEADER.join(",") + "\n";
        fs.writeFileSync(callLogsCsvPath, headerLine, "utf8");
    }
};

const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const serializeCsvRow = (row) => {
    return [
        escapeCsvValue(row.user_id),
        escapeCsvValue(row.patients_name),
        escapeCsvValue(row.call_sid),
        escapeCsvValue(row.child_call_sid),
        escapeCsvValue(row.to_number),
        escapeCsvValue(row.from_number),
        escapeCsvValue(row.status),
        escapeCsvValue(row.direction),
        escapeCsvValue(row.timestamp),
        escapeCsvValue(row.created_at),
        escapeCsvValue(row.started_at),
        escapeCsvValue(row.ended_at),
        escapeCsvValue(row.duration)
    ].join(",");
};

const loadCallLogsCsv = () => {
    ensureCallLogsCsvHeader();
    const content = fs.readFileSync(callLogsCsvPath, "utf8");
    const lines = content.split("\n").filter(Boolean);

    // first line is header, rest are data rows
    const rows = lines.slice(1).map(line => line.split(","));
    return rows;
};

const saveCallLogsCsv = (rows) => {
    const headerLine = CALL_LOGS_HEADER.join(",");
    const bodyLines = rows.map(cols => cols.join(","));
    const all = [headerLine, ...bodyLines].join("\n") + "\n";
    fs.writeFileSync(callLogsCsvPath, all, "utf8");
};

// Incoming side: upsert key is call_sid (index 2)
const upsertIncomingCallLogCsv = (row) => {
    const rows = loadCallLogsCsv();

    const callSid = row.call_sid || "";
    let updated = false;

    for (let i = 0; i < rows.length; i++) {
        const cols = rows[i];
        const existingCallSid = cols[2] || ""; // index 2 => call_sid

        if (existingCallSid === callSid && callSid) {
            cols[0] = row.user_id ?? cols[0];
            cols[1] = row.patients_name ?? cols[1];
            cols[2] = row.call_sid ?? cols[2];
            cols[3] = row.child_call_sid ?? cols[3];
            cols[4] = row.to_number ?? cols[4];
            cols[5] = row.from_number ?? cols[5];
            cols[6] = row.status ?? cols[6];
            cols[7] = row.direction ?? cols[7];
            cols[8] = row.timestamp ?? cols[8];
            cols[9] = row.created_at ?? cols[9];
            cols[10] = row.started_at ?? cols[10];
            cols[11] = row.ended_at ?? cols[11];
            cols[12] = (row.duration !== undefined ? String(row.duration) : cols[12]);

            rows[i] = cols;
            updated = true;
            break;
        }
    }

    if (!updated) {
        const serialized = serializeCsvRow(row);
        const cols = serialized.split(",");
        rows.push(cols);
    }

    saveCallLogsCsv(rows);
};

const getPatientNameFromIncomingNumber = async (userId, fromNumber) => {
    try {
        if (!userId || !fromNumber) return fromNumber;

        const { data, error } = await supabase
            .from("patients")
            .select("name")
            .eq("user_id", userId)
            .eq("phone", fromNumber)
            .maybeSingle();

        if (error) {
            console.error("Error fetching patient name (incoming):", error);
            return fromNumber;
        }

        if (data?.name) {
            return data.name;
        }

        return fromNumber;
    } catch (err) {
        console.error("Unexpected error fetching patient name (incoming):", err);
        return fromNumber;
    }
};

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

        // dial.client(userId);
        dial.client({
            statusCallbackEvent: 'initiated ringing answered completed',
            statusCallback: `${config.BASE_URL}/api/incoming-call/status-callback`,
            statusCallbackMethod: 'POST'
        }, userId);
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
 * POST /api/incoming-call/status-callback new
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

        // Only process the child leg (outbound-dial to Client) for CSV updates
        if (Direction == "inbound-dial" || Direction == "inbound-api") {
            const nowIso = new Date().toISOString();
            // For incoming call, patient ka number From hota hai
            const patientsName = await getPatientNameFromIncomingNumber(userId, fromNumber);

            if (CallStatus == "ringing" || CallStatus == "initiated") {
                // Insert-like behavior if not exists, update if already there
                upsertIncomingCallLogCsv({
                    user_id: userId,
                    patients_name: patientsName,
                    call_sid: parentCallSid,
                    child_call_sid: CallSid,
                    to_number: toNumber,       // Twilio number (our number)
                    from_number: fromNumber,   // Caller's number
                    status: "ringing",
                    direction: Direction,
                    timestamp: Timestamp || nowIso,
                    created_at: nowIso,
                    started_at: "",
                    ended_at: "",
                    duration: ""
                });
                console.log("🔔 Incoming call - ringing CSV record created/updated");

            } else if (CallStatus == "in-progress") {
                upsertIncomingCallLogCsv({
                    user_id: userId,
                    patients_name: patientsName,
                    call_sid: parentCallSid,
                    child_call_sid: CallSid,
                    to_number: toNumber,
                    from_number: fromNumber,
                    status: "in-progress",
                    direction: Direction,
                    timestamp: Timestamp || nowIso,
                    created_at: undefined,
                    started_at: nowIso,
                    ended_at: "",
                    duration: ""
                });

                console.log("🟢 Incoming call answered! Timer started - CSV row updated - UserId:", userId);
                // TODO: WebSocket → frontend timer start

            } else if (CallStatus == "no-answer" || CallStatus == "failed" || CallStatus == "busy") {
                upsertIncomingCallLogCsv({
                    user_id: userId,
                    patients_name: patientsName,
                    call_sid: parentCallSid,
                    child_call_sid: CallSid,
                    to_number: toNumber,
                    from_number: fromNumber,
                    status: CallStatus,
                    direction: Direction,
                    timestamp: Timestamp || nowIso,
                    created_at: undefined,
                    started_at: undefined,
                    ended_at: nowIso,
                    duration: ""
                });

                callStore.delete(parentCallSid);
                console.log("📵 Incoming call - no answer / failed - CSV row updated - UserId:", userId);

            } else if (CallStatus == "completed") {
                upsertIncomingCallLogCsv({
                    user_id: userId,
                    patients_name: patientsName,
                    call_sid: parentCallSid,
                    child_call_sid: CallSid,
                    to_number: toNumber,
                    from_number: fromNumber,
                    status: "completed",
                    direction: Direction,
                    timestamp: Timestamp || nowIso,
                    created_at: undefined,
                    started_at: undefined,
                    ended_at: nowIso,
                    duration: CallDuration || 0
                });

                callStore.delete(parentCallSid);
                console.log("🔴 Incoming call ended. Timer stop - CSV row updated - UserId:", userId);
                // TODO: WebSocket → frontend timer stop
            }
        }

        return res.status(200).send("OK");

    } catch (error) {
        console.error("Error handling incoming call status callback:", error);
        return res.status(500).send("Error");
    }
};
