import { config } from "../config/env.js";
import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: config.ANTHROPIC_API_KEY,
});

export const validateReferral = async ({ subject, body }) => {
    if (!config.ANTHROPIC_API_KEY) {
        console.warn("Anthropic API key is not configured. Skipping referral validation.");
        return false;
    }

    try {

        const prompt = `You are analyzing an email to determine if it contains a dental referral or dentist referring form.

        Email Subject: ${subject}

        Email Body:
        ${body}

        Question: Is this email related to a dental referral where a dentist is sending a patient referral form or dental referral information?

        Respond with ONLY one word:
        YES
        or
        NO

        Response:`;

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 200,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });
        // console.log("response==>", response?.content?.[0]?.text);
        const rawText =
            response?.content?.[0]?.text ||
            (Array.isArray(response?.content)
                ? response.content.map((c) => c.text || "").join(" ")
                : "");

        const answer = (rawText || "").trim().toLowerCase();
        // console.log("answer==>", answer);
        if (!answer) return false;

        if (answer.startsWith("yes")) return true;
        if (answer.startsWith("no")) return false;

        // Fallback: look for yes/no anywhere in the string
        if (answer.includes("yes")) return true;
        if (answer.includes("no")) return false;

        return false;
    } catch (error) {
        console.error("Anthropic validateReferral error:", error?.response?.data || error.message);
        return false;
    }
};

/**
 * Check if an email is requesting a doctor appointment.
 * Returns boolean: true = appointment-related, false = not.
 */
export const isAppointmentEmail = async ({ subject, body }) => {
    console.log("check by AI isAppointmentEmail==>");
    if (!config.ANTHROPIC_API_KEY) {
        console.warn("Anthropic API key is not configured. Skipping appointment intent check.");
        return false;
    }

    try {
        const prompt = `You are analyzing an email to determine if a PATIENT (or someone acting on behalf of a patient, like a family member or caretaker) is trying to book, reschedule, cancel, or confirm a doctor appointment directly with this clinic.

        Email Subject: ${subject}
        
        Email Body:
        ${body}
        
        Rules for answering YES:
        - A patient or their representative is requesting a new appointment
        - A patient is rescheduling or canceling an existing appointment
        - A patient is confirming or asking about their appointment details
        
        Rules for answering NO:
        - The email is a referral from another doctor or clinic (doctor-to-doctor communication)
        - The email is from insurance, pharmacy, or a third-party provider
        - The email is about test results, prescriptions, or general medical inquiries (not appointment booking)
        - The email is a newsletter, promotional, or automated notification
        - The email is spam or unrelated to appointments
        
        Question: Is this email a direct appointment request or appointment management action from a patient (or their representative)?
        
        Respond with ONLY one word:
        YES
        or
        NO
        
        Response:`;

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 50,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const rawText =
            response?.content?.[0]?.text ||
            (Array.isArray(response?.content)
                ? response.content.map((c) => c.text || "").join(" ")
                : "");

        const answer = (rawText || "").trim().toLowerCase();
        console.log("isAppointmentEmail==> answer==>", answer);
        if (!answer) return false;

        if (answer.startsWith("yes")) return true;
        if (answer.startsWith("no")) return false;

        if (answer.includes("yes")) return true;
        if (answer.includes("no")) return false;

        return false;
    } catch (error) {
        console.error("Anthropic isAppointmentEmail error:", error?.response?.data || error.message);
        return false;
    }
};

/**
 * Ask AI to pick the best-matching doctor for this email
 * from a provided list, or return "NO_MATCH".
 *
 * @param {object} params
 * @param {string} params.subject
 * @param {string} params.body
 * @param {Array<{ name: string, specialty?: string, services?: string[] }>} params.doctors
 * @returns {Promise<string>} doctor name exactly as in list, or "NO_MATCH"
 */
export const matchDoctorForAppointment = async ({ subject, body, doctors }) => {
    if (!config.ANTHROPIC_API_KEY) {
        console.warn("Anthropic API key is not configured. Skipping doctor match.");
        return "NO_MATCH";
    }

    if (!Array.isArray(doctors) || doctors.length === 0) {
        return "NO_MATCH";
    }

    try {
        const doctorsDescription = doctors
            .map((d, idx) => {
                const services = Array.isArray(d.services) ? d.services.join(", ") : "";
                const specialty = d.specialty || "";
                return `${idx + 1}. Name: ${d.name}\n   Specialty: ${specialty}\n   Services: ${services}`;
            })
            .join("\n\n");

        const prompt = `You are helping assign a patient email to the most suitable doctor from the list below.

Only use the fields provided: name, specialty, services. Do NOT assume anything about weekly availability or make up new information.

Patient Email Subject: ${subject}

Patient Email Body:
${body}

Available Doctors:
${doctorsDescription}

Your decision rules:
- If the patient clearly mentions a specific doctor by name, return that doctor's name exactly as shown in the list.
- ELSE IF the patient clearly describes a specific treatment or problem (for example: "root canal", "braces", "implants", "teeth whitening") that clearly matches ONE best doctor from the list, return that doctor's name.
- ELSE IF the patient talks about an appointment but does NOT clearly mention any doctor name AND does NOT clearly describe any specific treatment or dental problem, respond with exactly: ASK_PREFERENCE
- ELSE IF the requested treatment clearly does NOT match any doctor in the list (no one offers that service), respond with exactly: NO_MATCH

Respond with EXACTLY ONE WORD or ONE LINE, with no extra text:
- Either the doctor's name exactly as shown in the list above
- Or the word: ASK_PREFERENCE
- Or the word: NO_MATCH

Response:`;

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 100,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const rawText =
            response?.content?.[0]?.text ||
            (Array.isArray(response?.content)
                ? response.content.map((c) => c.text || "").join(" ")
                : "");

        if (!rawText) return "NO_MATCH";

        const answer = rawText.trim();
        const lower = answer.toLowerCase();

        if (
            lower === "ask_preference" ||
            lower === "ask preference" ||
            lower.includes("ask_preference")
        ) {
            return "ASK_PREFERENCE";
        }

        if (
            lower === "no_match" ||
            lower === "no match" ||
            lower.includes("no_match")
        ) {
            return "NO_MATCH";
        }

        // Try exact (case-insensitive) match to any doctor name
        for (const d of doctors) {
            if (!d?.name) continue;
            if (answer.toLowerCase() === d.name.toLowerCase()) {
                return d.name;
            }
        }

        // Fallback: substring match
        for (const d of doctors) {
            if (!d?.name) continue;
            if (lower.includes(d.name.toLowerCase())) {
                return d.name;
            }
        }

        return "NO_MATCH";
    } catch (error) {
        console.error("Anthropic matchDoctorForAppointment error:", error?.response?.data || error.message);
        return "NO_MATCH";
    }
};

/**
 * Ask AI to pick the best appointment type from a user's appointment_types list
 * based on the email content and (optionally) the doctor's details.
 *
 * @param {object} params
 * @param {string} params.subject
 * @param {string} params.body
 * @param {string} [params.doctorName]
 * @param {string} [params.doctorSpecialty]
 * @param {Array<{ id: number, name: string }>} params.appointmentTypes
 * @returns {Promise<number|null>} matching appointment_type id, or null/NaN if no clear match
 */
export const selectAppointmentTypeForEmail = async ({
    subject,
    body,
    doctorName,
    doctorSpecialty,
    appointmentTypes,
}) => {
    if (!config.ANTHROPIC_API_KEY) {
        console.warn("Anthropic API key is not configured. Skipping appointment type selection.");
        return null;
    }

    if (!Array.isArray(appointmentTypes) || appointmentTypes.length === 0) {
        return null;
    }

    try {
        const typesDescription = appointmentTypes
            .map((t) => `- ID: ${t.id} | Name: ${t.name}`)
            .join("\n");

        const doctorInfoLines = [];
        if (doctorName) {
            doctorInfoLines.push(`Doctor: ${doctorName}`);
        }
        if (doctorSpecialty) {
            doctorInfoLines.push(`Doctor Specialty: ${doctorSpecialty}`);
        }

        const prompt = `You are selecting the best appointment type for a dental appointment
from the list of appointment types below.

Email Subject: ${subject}

Email Body:
${body}

${doctorInfoLines.join("\n")}

Available appointment types (from the database):
${typesDescription}

Decision rules:
- Choose the ONE appointment type whose name best matches the patient's request,
  treatment, or reason for visit in the email.
- If the patient clearly mentions a procedure (for example: "cleaning", "whitening",
  "root canal", "implant", "braces"), choose the most appropriate type by name.
- If multiple types could match, choose the MOST specific and best-fitting one.
- If none of the appointment types match the email content at all, respond with: NO_MATCH

Respond with EXACTLY ONE of:
- The numeric ID of the chosen appointment type (for example: 3)
- Or the word: NO_MATCH

No explanation, no extra text. Only the ID number or NO_MATCH.`;

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 50,
            temperature: 0,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const rawText =
            response?.content?.[0]?.text ||
            (Array.isArray(response?.content)
                ? response.content.map((c) => c.text || "").join(" ")
                : "");

        if (!rawText) return null;

        const answer = rawText.trim();
        const lower = answer.toLowerCase();

        if (lower === "no_match" || lower === "no match" || lower.includes("no_match")) {
            return null;
        }

        const numeric = parseInt(answer, 10);
        if (!Number.isNaN(numeric)) {
            return numeric;
        }

        // Fallback: maybe AI responded like "ID: 3"
        const matchId = answer.match(/(\d+)/);
        if (matchId) {
            const idNum = parseInt(matchId[1], 10);
            return Number.isNaN(idNum) ? null : idNum;
        }

        return null;
    } catch (error) {
        console.error("Anthropic selectAppointmentTypeForEmail error:", error?.response?.data || error.message);
        return null;
    }
};

/**
 * Try to detect if the patient has requested a specific slot (date + time)
 * in their email body. If so, return a normalized slot object; otherwise null.
 *
 * Returned shape (when not null):
 * { date: "YYYY-MM-DD", start_time: "HH:mm", end_time: "HH:mm" }
 */
export const extractRequestedSlot = async ({ body, practiceTimezone }) => {
    if (!config.ANTHROPIC_API_KEY) {
        console.warn("Anthropic API key is not configured. Skipping slot extraction.");
        return null;
    }

    try {
        const tzInfo = practiceTimezone || "the doctor's local timezone";

        const prompt = `You are helping interpret a patient's email to see if they are asking for a specific appointment date and time.

Email Body:
${body}

Instructions:
- Determine if the patient is clearly requesting a specific appointment slot (a concrete date AND time range).
- If they mention something vague like "next week" or "any morning", treat it as NO specific slot.
- Assume all dates and times are in ${tzInfo}.

Respond in STRICT JSON with this exact shape, and NOTHING else:
{
  "has_slot": true or false,
  "date": "YYYY-MM-DD or null",
  "start_time": "HH:mm or null",
  "end_time": "HH:mm or null"
}

Examples:
- If the patient writes "Can I come on March 10 at 3pm for one hour?", you might respond:
  {"has_slot": true, "date": "2026-03-10", "start_time": "15:00", "end_time": "16:00"}
- If the patient does NOT specify a concrete time, respond:
  {"has_slot": false, "date": null, "start_time": null, "end_time": null}
`;

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 200,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        let rawText =
            response?.content?.[0]?.text ||
            (Array.isArray(response?.content)
                ? response.content.map((c) => c.text || "").join(" ")
                : "");

        if (!rawText) return null;

        rawText = rawText.trim();

        // Try to extract JSON object from the response
        const startIdx = rawText.indexOf("{");
        const endIdx = rawText.lastIndexOf("}");
        if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
            return null;
        }

        const jsonStr = rawText.slice(startIdx, endIdx + 1);

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            return null;
        }

        if (!parsed || parsed.has_slot === false) {
            return null;
        }

        const date = typeof parsed.date === "string" ? parsed.date : null;
        const start_time = typeof parsed.start_time === "string" ? parsed.start_time : null;
        const end_time = typeof parsed.end_time === "string" ? parsed.end_time : null;

        if (!date || !start_time || !end_time) {
            return null;
        }

        return { date, start_time, end_time };
    } catch (error) {
        console.error("Anthropic extractRequestedSlot error:", error?.response?.data || error.message);
        return null;
    }
};


/**
 * Extracts requested booking slots from an email
 * 
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @returns {Promise<Array<Object>|null>} - Array of { day, time } objects or null
 */
export async function extractBookingSlots(subject, body) {
    try {
        if (!config.ANTHROPIC_API_KEY) {
            console.log('⚠️  ANTHROPIC_API_KEY not configured, skipping slot extraction');
            return null;
        }

        console.log('🤖 Extracting requested booking slots from email...');

        // const anthropic = new Anthropic({
        //     apiKey: config.ANTHROPIC_API_KEY,
        // });

        const prompt = `
You are extracting appointment booking slots from an email. Each slot = 1 hour.

Email Subject: ${subject}
Email Body: ${body}

TASK:
Extract ALL requested 1-hour appointment slots.

CRITICAL RULES FOR TIME RANGES:
- If a time RANGE is mentioned like "1 PM to 3 PM" → create SEPARATE slots for each hour:
  [{"day": "Monday", "time": "1:00 PM"}, {"day": "Monday", "time": "2:00 PM"}]
- If client says "2 hours" or "2 slots" on a day with a start time → expand into individual hourly slots
- If a single time is mentioned like "10 AM" → just one slot: [{"day": "Monday", "time": "10:00 AM"}]
- If client says "book from 9 AM to 12 PM" → 3 slots: 9:00 AM, 10:00 AM, 11:00 AM

EXAMPLES:
Input: "I need 1 PM to 3 PM on Monday"
Output: [{"day": "Monday", "time": "1:00 PM"}, {"day": "Monday", "time": "2:00 PM"}]

Input: "Book me 10 AM on Tuesday and 2 PM to 4 PM on Wednesday"
Output: [{"day": "Tuesday", "time": "10:00 AM"}, {"day": "Wednesday", "time": "2:00 PM"}, {"day": "Wednesday", "time": "3:00 PM"}]

Input: "I want 3 hours starting 9 AM Friday"
Output: [{"day": "Friday", "time": "9:00 AM"}, {"day": "Friday", "time": "10:00 AM"}, {"day": "Friday", "time": "11:00 AM"}]

RULES:
- "day" must be full weekday name (Monday, Tuesday, etc.)
- If full date mentioned, use YYYY-MM-DD format instead of day name
- "time" must be in 12-hour format with AM/PM (e.g., "1:00 PM")
- End time is the START of the LAST slot (1 PM to 3 PM = 1:00 PM and 2:00 PM)
- If no valid slot found, return: []

OUTPUT FORMAT:
Return STRICT JSON ARRAY ONLY.
NO explanation, NO markdown, NO code blocks, NO extra text.
Only valid JSON array.`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024, // ⬆️ increased for multiple slots
            temperature: 0,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
        });

        const responseText = message.content[0].text.trim();
        const cleanedResponse = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const slots = JSON.parse(cleanedResponse);

        console.log(`🤖 Extracted ${slots.length} booking slot(s)`);
        return slots.length > 0 ? slots : null;

    } catch (error) {
        console.error('❌ Error extracting booking slots:', error.message);
        return null;
    }
}