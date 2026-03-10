import { google } from "googleapis";
import { DateTime } from "luxon";
import { supabase } from "../config/database.js";
import { sendEmailWithApi } from "../utils/email.js";
import { config } from "../config/env.js";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export const connectGoogle = async (req, res) => {
    try {
        const { doctor_id } = req.query;
        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                message: "Doctor ID is required"
            });
        }

        const { data: doctor, error: doctorFetchError } = await supabase
            .from("doctors")
            .select("email")
            .eq("id", doctor_id)
            .single();
        if (doctorFetchError || !doctor) {
            console.log("doctor not found");
            return res.status(400).json({
                success: false,
                message: "Doctor not found.",
            });
        }

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: ["https://www.googleapis.com/auth/calendar"],
            state: JSON.stringify({
                doctor_id,
                type: "calendar"
            })
        });

        const templatePath = path.join(__dirname, "../utils/html/connect_calendar.html");
        let html = await fs.readFile(templatePath, "utf8");
        const logoUrl = config.LOGO_URL || "";
        // console.log("logoUrl==>", logoUrl);

        html = html.replace(/\$\{authUrl\}/g, authUrl).replace(/\$\{logoUrl\}/g, logoUrl);

        const text = `Please use the following link to connect your Google Calendar: ${authUrl}`;


        let result = await sendEmailWithApi({
            email: doctor.email,
            subject: "Connect your Google Calendar to Denstis AI",
            text,
            html,
        });

        if (!result.messageId) {
            return res.status(500).json({
                success: false,
                message: "Failed to send email.",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Email sent on doctor's email successfully",
        });
    } catch (error) {
        console.error("Error connecting to Google Calendar:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const googleCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        const { type, doctor_id } = JSON.parse(state);
        console.log("type==>", type);
        if (type == "calendar") {

            const { tokens } = await oauth2Client.getToken(code);
            if (!tokens.refresh_token) {
                console.log("No refresh token received");
            }
            const { data, error, count } = await supabase
                .from("doctors")
                .update({
                    google_refresh_token: tokens.refresh_token,
                    calendar_connected: true
                })
                .eq("id", doctor_id)
                .select("*", { count: "exact" });

            res.send("Google Calendar connected successfully. You can close this window.");
        } else if (type == "gmail") {

            const { userId } = JSON.parse(state);
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const gmail = google.gmail({ version: "v1", auth: oauth2Client });

            // Get user Gmail email
            const profile = await gmail.users.getProfile({
                userId: "me",
            });

            const gmailEmail = profile.data.emailAddress;
            const { error } = await supabase
                .from("user_gmail_accounts")
                .upsert(
                    {
                        user_id: userId,
                        gmail_email: gmailEmail,
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token ?? undefined,
                        token_expiry: tokens.expiry_date
                            ? new Date(tokens.expiry_date)
                            : null,
                        is_active: true,
                        updated_at: new Date(),
                    },
                    { onConflict: "user_id" }
                );

            if (error) {
                console.log("gmail connect error in callback==>", error);
                return res.status(500).json({
                    success: false,
                    message: error.message,
                });
            }

            return res.send("Gmail connected successfully. You can close this window.");
        }
    } catch (error) {
        console.error("Error handling Google callback:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const createAppointment = async (req, res) => {
    try {
        const {
            user_id,
            timezone,
            start_time,
            end_time,
            appointment_type_id,
            doctor_id,
            patient_details,
            notes
        } = req.body;
        // console.log("From frontend start_time=>", start_time);
        // console.log("From frontend end_time=>", end_time);
        if (!user_id || !doctor_id || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: user_id, doctor_id, start_time, end_time",
            });
        }

        const startDt = DateTime.fromISO(start_time);
        const endDt = DateTime.fromISO(end_time);
        // console.log("From backend startDt=>", startDt);
        // console.log("From backend endDt=>", endDt);
        if (!startDt.isValid || !endDt.isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid start_time or end_time ISO format",
            });
        }

        const startUTC = startDt.toUTC().toISO();
        const endUTC = endDt.toUTC().toISO();
        if (endDt <= startDt) {
            return res.status(400).json({
                success: false,
                message: "End time must be after start time.",
            });
        }

        const practiceTimezone = await getPracticeTimezone(user_id);
        const tz = practiceTimezone || "UTC";

        const { data: doctor, error: doctorFetchError } = await supabase
            .from("doctors")
            .select("*")
            .eq("user_id", user_id)
            .eq("id", doctor_id)
            .single();

        if (doctorFetchError || !doctor) {
            return res.status(400).json({
                success: false,
                message: "Doctor not found.",
            });
        }

        const conflictError = await validateNoConflict(doctor_id, startUTC, endUTC);
        if (conflictError) {
            return res.status(400).json({ success: false, message: conflictError });
        }

        const leaveError = validateDoctorNotOnLeave(doctor, startUTC, tz);
        if (leaveError) {
            return res.status(400).json({ success: false, message: leaveError });
        }

        const availabilityError = validateDoctorAvailable(doctor, startUTC, endUTC, tz);
        if (availabilityError) {
            return res.status(400).json({ success: false, message: availabilityError });
        }

        const meeting_date = DateTime.fromISO(startUTC).toFormat("yyyy-MM-dd");

        const { data: appointment, error: insertError } = await supabase
            .from("doctors_appointments")
            .insert({
                user_id,
                timezone: timezone || null,
                meeting_date,
                start_time: startUTC,
                end_time: endUTC,
                appointment_type_id,
                doctor_id,
                patient_details,
                notes,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error inserting appointment:", insertError.message);
            return res.status(500).json({
                success: false,
                message: insertError.message || "Error inserting appointment",
            });
        }

        // Also record entry in patients_appointment_history
        try {
            const patientId =
                patient_details?.patient_id ??
                (typeof appointment?.patient_id === "number"
                    ? appointment.patient_id
                    : null);

            await supabase.from("patients_appointment_history").insert({
                patient_id: patientId,
                purpose: notes || "Manual appointment created",
                doctor_id,
                status: "scheduled",
                user_id,
                date: meeting_date,
            });
        } catch (historyError) {
            console.error(
                "Error inserting patients_appointment_history for manual appointment:",
                historyError
            );
            // Do not fail the whole flow if history insert fails
        }

        const eventTimezone = practiceTimezone || timezone || "UTC";

        if (doctor?.calendar_connected) {
            createGoogleEvent(doctor, appointment, eventTimezone).catch((googleError) => {
                console.error("Error creating Google Calendar event:", googleError);
            });
        }

        return res.status(201).json({
            success: true,
            message: "Appointment created successfully",
            data: appointment
        });
    } catch (error) {
        console.error("Unexpected error creating appointment:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ---------- Validation helpers (all work in UTC / practice timezone) ----------

/** Parse time string "09:00" or "09:00 AM" to minutes since midnight */
function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const match12 = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
        let h = parseInt(match12[1], 10);
        const m = parseInt(match12[2], 10);
        const period = match12[3].toUpperCase();
        if (period === "PM" && h !== 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        return h * 60 + m;
    }
    const match24 = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        const h = parseInt(match24[1], 10);
        const m = parseInt(match24[2], 10);
        return h * 60 + m;
    }
    return 0;
}

/** Day name from DateTime in given zone: "Mon", "Tue", ... "Sun" */
function getDayName(dt) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dt.weekday % 7];
}

/**
 * 1. Same doctor: no overlapping appointment (UTC).
 * Returns error message string or null.
 */
async function validateNoConflict(doctor_id, startUTC, endUTC) {
    const { data: existing } = await supabase
        .from("doctors_appointments")
        .select("id")
        .eq("doctor_id", doctor_id)
        .lt("start_time", endUTC)
        .gt("end_time", startUTC);

    if (existing && existing.length > 0) {
        return "This doctor already has an appointment in this time slot. Please choose another time.";
    }
    return null;
}

/**
 * 2. Doctor not on leave on appointment date (off_days: array of JSON strings with from, to dates).
 * Appointment date is taken in practice timezone.
 */
function validateDoctorNotOnLeave(doctor, startUTC, practiceTimezone) {
    const off_days = doctor.off_days || [];
    const startInTz = DateTime.fromISO(startUTC, { zone: "utc" }).setZone(practiceTimezone);
    const appointmentDateStr = startInTz.toFormat("yyyy-MM-dd");

    for (const item of off_days) {
        let od;
        try {
            od = typeof item === "string" ? JSON.parse(item) : item;
        } catch {
            continue;
        }
        const from = od.from;
        const to = od.to;
        if (!from || !to) continue;
        if (appointmentDateStr >= from && appointmentDateStr <= to) {
            const name = od.name ? ` (${od.name})` : "";
            return `Doctor is on leave on this date${name}. Please choose another day.`;
        }
    }
    return null;
}

/**
 * 3. Doctor is available that day and time (weekly_availability: day-wise { enabled, start, end }).
 * Start/end of appointment in practice timezone must fall within that day's slot.
 */
function validateDoctorAvailable(doctor, startUTC, endUTC, practiceTimezone) {
    const weekly = doctor.weekly_availability || {};
    const startInTz = DateTime.fromISO(startUTC, { zone: "utc" }).setZone(practiceTimezone);
    const endInTz = DateTime.fromISO(endUTC, { zone: "utc" }).setZone(practiceTimezone);

    const dayName = getDayName(startInTz);
    const avail = weekly[dayName];

    if (!avail || !avail.enabled) {
        return `Doctor is not available on ${dayName}s. Please choose another day.`;
    }

    const apptStartMinutes = startInTz.hour * 60 + startInTz.minute;
    const apptEndMinutes = endInTz.hour * 60 + endInTz.minute;
    const slotStart = timeToMinutes(avail.start);
    const slotEnd = timeToMinutes(avail.end);

    if (apptStartMinutes < slotStart) {
        return `Doctor is available from ${avail.start} on ${dayName}s. Please choose a time within working hours.`;
    }
    if (apptEndMinutes > slotEnd) {
        return `Doctor is available until ${avail.end} on ${dayName}s. Please choose a time within working hours.`;
    }
    return null;
}

const getPracticeTimezone = async (user_id) => {
    try {
        const { data, error } = await supabase
            .from("practice_details")
            .select("address")
            .eq("user_id", user_id)
            .single();
        if (error) throw error;
        return data?.address?.time_zone ?? null;
    } catch (error) {
        console.error("Error fetching practice timezone:", error);
        return null;
    }
};

/**
 * Create Google Calendar event. appointment has start_time, end_time (UTC ISO).
 * We send local time in practice timezone so Google displays correctly.
 */
export const createGoogleEvent = async (doctor, appointment, timeZone) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    if (!doctor.google_refresh_token) {
        const { data: doctorData, error: doctorDataError } = await supabase
            .from("doctors")
            .select("*")
            .eq("id", doctor.id)
            .single();
        if (doctorDataError) {
            console.log("doctorDataError==>", doctorDataError);
        } else if (doctorData) {
            doctor = doctorData;
        }
    }
    oauth2Client.setCredentials({
        refresh_token: doctor.google_refresh_token,
    });

    const calendar = google.calendar({
        version: "v3",
        auth: oauth2Client,
    });

    const startDt = DateTime.fromISO(appointment.start_time, { zone: "utc" }).setZone(timeZone);
    const endDt = DateTime.fromISO(appointment.end_time, { zone: "utc" }).setZone(timeZone);

    const startDateTime = startDt.toFormat("yyyy-MM-dd'T'HH:mm:ss");
    const endDateTime = endDt.toFormat("yyyy-MM-dd'T'HH:mm:ss");

    const summaryName =
        appointment.patient_details?.name ||
        appointment.patient_details?.patient_name ||
        "Patient";

    const tz = timeZone || "UTC";

    try {
        await calendar.events.insert({
            calendarId: "primary",
            requestBody: {
                summary: `Appointment - ${summaryName}`,
                start: {
                    dateTime: startDateTime,
                    timeZone: tz,
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: tz,
                },
            },
        });
    }
    catch (err) {
        console.log("err.response?.data?.error==>", err);
        console.log("err.response?.data?.error==>", err.response?.data?.error);

        if (
            err.response?.data?.error === "invalid_grant" ||
            err.response?.data?.error_description?.includes("expired")
        ) {
            await supabase
                .from("doctors")
                .update({ calendar_connected: false })
                .eq("id", doctor.id);
        }
    }
};
