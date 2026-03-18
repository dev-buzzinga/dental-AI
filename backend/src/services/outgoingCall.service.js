import { supabase } from "../config/database.js";
import twilio from "twilio";
import { config } from "../config/env.js";
import fs from "fs";
import path from "path";

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
    "duration",
    "recording_sid",
    "recording_url",
    "transcription_sid"
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

const parseCsvLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (inQuotes) {
            if (ch === '"') {
                const next = line[i + 1];
                if (next === '"') {
                    cur += '"';
                    i++; // consume escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                cur += ch;
            }
        } else {
            if (ch === ",") {
                out.push(cur);
                cur = "";
            } else if (ch === '"') {
                inQuotes = true;
            } else {
                cur += ch;
            }
        }
    }
    out.push(cur);
    return out;
};

const toCsvLine = (cols) => cols.map(escapeCsvValue).join(",");

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
        escapeCsvValue(row.duration),
        escapeCsvValue(row.recording_sid),
        escapeCsvValue(row.recording_url),
        escapeCsvValue(row.transcription_sid)
    ].join(",");
};

const loadCallLogsCsvWithHeader = () => {
    ensureCallLogsCsvHeader();
    const content = fs.readFileSync(callLogsCsvPath, "utf8");
    const lines = content.split("\n").filter(Boolean);

    const header = lines.length ? parseCsvLine(lines[0]) : [...CALL_LOGS_HEADER];
    const rows = lines.slice(1).map((line) => parseCsvLine(line));
    return { header, rows };
};

const saveCallLogsCsvWithHeader = (header, rows) => {
    const headerLine = toCsvLine(header);
    const bodyLines = rows.map((cols) => toCsvLine(cols));
    const all = [headerLine, ...bodyLines].join("\n") + "\n";
    fs.writeFileSync(callLogsCsvPath, all, "utf8");
};

const ensureColumns = (header, rows, requiredColumns) => {
    let changed = false;

    for (const colName of requiredColumns) {
        if (!header.includes(colName)) {
            header.push(colName);
            const idx = header.length - 1;
            for (let r = 0; r < rows.length; r++) {
                rows[r][idx] = rows[r][idx] ?? "";
            }
            changed = true;
        }
    }

    // Normalize row lengths to header length
    for (let r = 0; r < rows.length; r++) {
        if (rows[r].length < header.length) {
            rows[r] = [...rows[r], ...Array(header.length - rows[r].length).fill("")];
            changed = true;
        } else if (rows[r].length > header.length) {
            rows[r] = rows[r].slice(0, header.length);
            changed = true;
        }
    }

    return changed;
};

const upsertCallLogCsv = (row) => {
    // row is an object in same shape as serializeCsvRow uses
    const { header, rows } = loadCallLogsCsvWithHeader();
    ensureColumns(header, rows, CALL_LOGS_HEADER);

    const childCallSid = row.child_call_sid || "";
    let updated = false;

    for (let i = 0; i < rows.length; i++) {
        const cols = rows[i];
        const existingChildCallSid = cols[3] || ""; // index 3 => child_call_sid

        if (existingChildCallSid === childCallSid && childCallSid) {
            // update existing row similar to DB update
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
        // new record (like ringing insert)
        const serialized = serializeCsvRow(row);
        rows.push(parseCsvLine(serialized));
    }

    saveCallLogsCsvWithHeader(header, rows);
};

const getPatientNameFromNumber = async (userId, toNumber) => {
    try {
        if (!userId || !toNumber) return toNumber;

        const { data, error } = await supabase
            .from("patients")
            .select("name")
            .eq("user_id", userId)
            .eq("phone", toNumber)
            .maybeSingle();

        if (error) {
            console.error("Error fetching patient name:", error);
            return toNumber;
        }

        if (data?.name) {
            return data.name;
        }

        return toNumber;
    } catch (err) {
        console.error("Unexpected error fetching patient name:", err);
        return toNumber;
    }
};
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

            // console.log("📞 callStore saved ==>", callStore.get(CallSid));
            twiml.start().transcription({
                intelligenceService: 'GA7f3362fbd0239aff1fb18c2b2c097a69',  // Console se mila SID
                statusCallbackUrl: `${config.BASE_URL}/api/outgoing-call/transcription-status`
            });
            // const dial = twiml.dial({ callerId, answerOnBridge: true });
            const dial = twiml.dial({
                callerId,
                answerOnBridge: true,
                record: 'record-from-answer-dual',        // dono speakers alag track mein
                recordingStatusCallback: `${config.BASE_URL}/api/outgoing-call/recording-status`,
                recordingStatusCallbackEvent: 'completed'  // jab recording ready ho tab callback
            });

            dial.number({
                statusCallbackEvent: 'initiated ringing answered completed',
                statusCallback: `${config.BASE_URL}/api/outgoing-call/status-callback`,
                statusCallbackMethod: 'POST'
            }, To);

        } else {
            twiml.say('No number provided');
        }

        const twimlString = twiml.toString();
        // console.log("TwiML being sent ==>", twimlString);
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

        // console.log("Twilio call status callback =>", {
        //     CallSid,
        //     ParentCallSid,
        //     CallStatus,
        //     Direction,
        //     From: fromNumber,
        //     To: toNumber,
        //     UserId: userId,
        //     Timestamp,
        // });

        // ─── CSV store + Timer-ish info ─────────────────────────
        if (Direction === 'outbound-dial') {
            const nowIso = new Date().toISOString();
            const patientsName = await getPatientNameFromNumber(userId, toNumber);

            if (CallStatus === 'ringing') {
                // DB: insert new row
                upsertCallLogCsv({
                    user_id: userId,
                    patients_name: patientsName,
                    call_sid: parentCallSid,
                    child_call_sid: CallSid,
                    to_number: toNumber,
                    from_number: fromNumber,
                    status: 'ringing',
                    direction: Direction,
                    timestamp: Timestamp || nowIso,
                    created_at: nowIso,
                    started_at: "",
                    ended_at: "",
                    duration: ""
                });
                console.log("🔔 Ringing - CSV record created/updated");

            } else if (CallStatus === 'in-progress') {
                // DB: update row, set status + started_at
                upsertCallLogCsv({
                    user_id: userId,
                    patients_name: patientsName,
                    call_sid: parentCallSid,
                    child_call_sid: CallSid,
                    to_number: toNumber,
                    from_number: fromNumber,
                    status: 'in-progress',
                    direction: Direction,
                    timestamp: Timestamp || nowIso,
                    created_at: undefined,
                    started_at: nowIso,
                    ended_at: "",
                    duration: ""
                });

                console.log("🟢 Call answered! Timer started - CSV row updated - UserId:", userId);
                // TODO: WebSocket → frontend timer start

            } else if (CallStatus === 'no-answer' || CallStatus === 'failed') {
                // DB: update row, set status only (and we also set ended_at for clarity)
                upsertCallLogCsv({
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
                console.log("📵 No answer / Failed - CSV row updated - UserId:", userId);

            } else if (CallStatus === 'completed') {
                // DB: update row, set completed + ended_at + duration
                upsertCallLogCsv({
                    user_id: userId,
                    patients_name: patientsName,
                    call_sid: parentCallSid,
                    child_call_sid: CallSid,
                    to_number: toNumber,
                    from_number: fromNumber,
                    status: 'completed',
                    direction: Direction,
                    timestamp: Timestamp || nowIso,
                    created_at: undefined,
                    started_at: undefined,
                    ended_at: nowIso,
                    duration: CallDuration || 0
                });

                callStore.delete(parentCallSid);
                console.log("🔴 Call ended. Timer band karo - CSV row updated - UserId:", userId);
                // TODO: WebSocket → frontend timer stop
            }
        }

        return res.status(200).send("OK");

    } catch (error) {
        console.error("Error handling call status callback:", error);
        return res.status(500).send("Error");
    }
};

// /api/recording-status
export const recordingCallbackService = async (req, res) => {
    // console.log("recording callback service ==>", req.body);
    try {
        const { CallSid, RecordingSid, RecordingUrl, RecordingStatus, } = req.body;
        if (RecordingStatus === 'completed') {
            // Update call_logs.csv where call_sid === CallSid
            if (CallSid) {
                const { header, rows } = loadCallLogsCsvWithHeader();
                ensureColumns(header, rows, ["recording_sid", "recording_url"]);

                const callSidIdx = header.indexOf("call_sid");
                const recSidIdx = header.indexOf("recording_sid");
                const recUrlIdx = header.indexOf("recording_url");

                if (callSidIdx !== -1) {
                    for (let i = 0; i < rows.length; i++) {
                        if (rows[i]?.[callSidIdx] === CallSid) {
                            rows[i][recSidIdx] = RecordingSid ?? rows[i][recSidIdx] ?? "";
                            rows[i][recUrlIdx] = RecordingUrl ?? rows[i][recUrlIdx] ?? "";
                            break;
                        }
                    }
                    saveCallLogsCsvWithHeader(header, rows);
                }
            }

            // console.log("RecordingSid ==>", RecordingSid);
            // console.log("RecordingUrl ==>", RecordingUrl);
            // console.log("CallSid ==>", CallSid);
        }
        return res.status(204).send();
    } catch (error) {
        console.error("Error handling recording callback:", error);
        return res.status(500).send("Error");
    }
};
// callback for transcription orignal
export const transcriptionCallbackService = async (req, res) => {
    // console.log("transcription callback ==>", req.query);

    try {
        const { transcript_sid, event_type } = req.query;

        if (event_type === 'voice_intelligence_transcript_available' && transcript_sid) {

            // ✅ Pehle client await karo
            // const client = await getTwilioClient("a6d729d6-efb6-4121-9c19-83ade5236b9e");

            // const transcript = await client.intelligence.v2
            //     .transcripts(transcript_sid)
            //     .fetch();
            // transcript.channel.participants.map(participant => {
            //     console.log("participant ==>", participant);
            // });

            // const sentences = await client.intelligence.v2
            //     .transcripts(transcript_sid)
            //     .sentences.list();
            // console.log("sentences ==>", sentences);
        }

        return res.status(204).send();
    } catch (error) {
        console.error("Error ==>", error);
        return res.status(500).send("Error");
    }
};
// callback for transcription
export const transcriptionCallbackServicePost = async (req, res) => {
    try {
        const { TranscriptionSid, CallSid } = req.body;
        if (TranscriptionSid && CallSid) {
            const { header, rows } = loadCallLogsCsvWithHeader();
            ensureColumns(header, rows, ["transcription_sid"]);

            const callSidIdx = header.indexOf("call_sid");
            const recSidIdx = header.indexOf("transcription_sid");
            if (callSidIdx !== -1 && recSidIdx !== -1) {
                for (let i = 0; i < rows.length; i++) {
                    if (rows[i]?.[callSidIdx] === CallSid) {
                        rows[i][recSidIdx] = TranscriptionSid ?? rows[i][recSidIdx] ?? "";
                        break;
                    }
                }
                saveCallLogsCsvWithHeader(header, rows);
            }
        }
        return res.status(204).send();
    } catch (error) {
        console.error("Error ==>", error);
        return res.status(500).send("Error");
    }
};

// list of calls for a user
export const getCallLogsService = async (req, res) => {
    try {

        const user_id = req.user?.id;
        const csvPath = path.join(process.cwd(), "call_logs.csv");

        // If user is not authenticated, don't return any data
        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: user not found in request"
            });
        }

        if (!fs.existsSync(csvPath)) {
            return res.json({ success: true, data: [] });
        }

        const content = fs.readFileSync(csvPath, "utf8");
        const lines = content.split("\n").filter(Boolean);
        if (lines.length <= 1) {
            return res.json({ success: true, data: [] });
        }

        const header = parseCsvLine(lines[0]);
        const rows = lines.slice(1).map((line, index) => {
            const cols = parseCsvLine(line);
            const row = {};
            header.forEach((key, i) => {
                row[key] = cols[i] ?? "";
            });

            return {
                id: index + 1,
                user_id: row.user_id || null,
                patients_name: row.patients_name || "",
                call_sid: row.call_sid || "",
                child_call_sid: row.child_call_sid || "",
                to_number: row.to_number || "",
                from_number: row.from_number || "",
                status: row.status || "",
                direction: row.direction || "",
                timestamp: row.timestamp || "",
                created_at: row.created_at || "",
                started_at: row.started_at || "",
                ended_at: row.ended_at || "",
                duration: row.duration || "",
                recording_sid: row.recording_sid || "",
                recording_url: row.recording_url || "",
                transcription_sid: row.transcription_sid || ""
            };
        });

        // Filter rows so that only the current user's records are returned
        const filteredRows = rows.filter((row) => String(row.user_id) === String(user_id));

        return res.json({ success: true, data: filteredRows });
    } catch (err) {
        console.error("Error reading call_logs.csv:", err);
        return res.status(500).json({ success: false, message: "Failed to load calls" });
    }
};
