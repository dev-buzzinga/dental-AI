import { google } from "googleapis";
import { DateTime } from "luxon";
import { supabase } from "../config/database.js";

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
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: ["https://www.googleapis.com/auth/calendar"],
            state: doctor_id
        });
        return res.status(200).json({
            success: true,
            message: "Google Calendar connect URL generated successfully",
            url: authUrl,
        });
    } catch (error) {
        console.error("Error connecting to Google Calendar:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const googleCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        const doctor_id = Number(state);

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
        console.log("From frontend start_time=>", start_time);
        console.log("From frontend end_time=>", end_time);
        if (!user_id || !doctor_id || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: user_id, doctor_id, start_time, end_time",
            });
        }

        // Store UTC only. DB columns: start_time, end_time (TIMESTAMPTZ).
        const startUTC = DateTime.fromISO(start_time).toUTC().toISO();
        const endUTC = DateTime.fromISO(end_time).toUTC().toISO();
        console.log("startUTC=>", startUTC);
        console.log("endUTC=>", endUTC);
        if (!startUTC || !endUTC) {
            return res.status(400).json({
                success: false,
                message: "Invalid start_time or end_time ISO format",
            });
        }

        const meeting_date = DateTime.fromISO(startUTC).toFormat("yyyy-MM-dd");
        console.log("meeting_date=>", meeting_date);
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

        // 3. Fetch doctor
        const { data: doctor, error: doctorError } = await supabase
            .from("doctors")
            .select("*")
            .eq("user_id", user_id)
            .eq("id", doctor_id)
            .single();

        if (doctorError) {
            console.error("Error fetching doctor for appointment:", doctorError);
            return res.status(201).json({
                success: true,
                message: "Appointment created successfully",
                data: appointment
            });
        }

        const practiceTimezone = await getPracticeTimezone(user_id);
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
const createGoogleEvent = async (doctor, appointment, timeZone) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

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
};
