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