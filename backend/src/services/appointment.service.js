import { google } from "googleapis";
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
        // Store refresh_token in Supabase
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
            meeting_date,
            from,
            to,
            appointment_type_id,
            doctor_id,
            patient_details,
            notes
        } = req.body;

        if (!user_id || !doctor_id || !meeting_date || !from || !to) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields for appointment creation",
            });
        }

        // 1. Save appointment in doctors_appointments (same shape as FE previously used)
        const { data: appointment, error: insertError } = await supabase
            .from("doctors_appointments")
            .insert({
                user_id,
                timezone,
                meeting_date,
                from,
                to,
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

        // 2. Fetch doctor
        const { data: doctor, error: doctorError } = await supabase
            .from("doctors")
            .select("*")
            .eq("user_id", user_id)
            .eq("id", doctor_id)
            .single();

        if (doctorError) {
            console.error("Error fetching doctor for appointment:", doctorError);
            // Appointment is created even if doctor fetch fails
            return res.status(201).json({
                success: true,
                message: "Appointment created successfully",
                data: appointment
            });
        }
        console.log("doctor=>", doctor);
        // 3. If Google connected → create event in background (do not block response)
        if (doctor?.calendar_connected) {
            console.log("Creating Google Calendar event");
            createGoogleEvent(doctor, appointment).catch((googleError) => {
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

const buildDateTimeString = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;

    // Handle 12-hour format: "09:00 AM"
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    let hours;
    let minutes;

    if (match12) {
        hours = parseInt(match12[1], 10);
        minutes = parseInt(match12[2], 10);
        const period = match12[3].toUpperCase();

        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
    } else {
        // Handle 24-hour format: "14:30"
        const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        if (!match24) return null;

        hours = parseInt(match24[1], 10);
        minutes = parseInt(match24[2], 10);
    }

    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");

    return `${dateStr}T${hh}:${mm}:00`;
};

const createGoogleEvent = async (doctor, appointment) => {
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

    const startDateTime = buildDateTimeString(appointment.meeting_date, appointment.from);
    const endDateTime = buildDateTimeString(appointment.meeting_date, appointment.to);

    if (!startDateTime || !endDateTime) {
        console.error("Invalid date/time for Google Calendar event", {
            meeting_date: appointment.meeting_date,
            from: appointment.from,
            to: appointment.to,
        });
        return;
    }

    const summaryName =
        appointment.patient_details?.name ||
        appointment.patient_details?.patient_name ||
        "Patient";

    await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
            summary: `Appointment - ${summaryName}`,
            start: {
                dateTime: startDateTime,
                timeZone: appointment.timezone || "Asia/Kolkata",
            },
            end: {
                dateTime: endDateTime,
                timeZone: appointment.timezone || "Asia/Kolkata",
            },
        },
    });
};