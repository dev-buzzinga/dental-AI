
import { google } from "googleapis";
import { config } from "../config/env.js";
import { supabase } from "../config/database.js";
import { sendEmailWithApi } from "../utils/email.js";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
);

export const SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email"
];
export const connectGmail = async (req, res) => {
    try {
        // console.log("req.user", req.user);
        const userId = req.user.id;
        const userEmail = req.user.email;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const url = oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: SCOPES,
            state: JSON.stringify({
                userId,
                type: "gmail"
            })
        });

        const templatePath = path.join(__dirname, "../utils/html/connect_gmail.html");
        let html = await fs.readFile(templatePath, "utf8");
        const logoUrl = config.LOGO_URL || "";

        html = html.replace(/\$\{authUrl\}/g, url).replace(/\$\{logoUrl\}/g, logoUrl);

        const text = `Please use the following link to connect your Google Gmail: ${url}`;


        let result = await sendEmailWithApi({
            email: userEmail,
            subject: "Connect your Google Gmail to Denstis AI",
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
            message: "Email sent on your email successfully",
            url: url,
        });
    } catch (error) {
        console.error("Error connecting to Gmail:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// export const gmailCallback = async (req, res) => {

//     try {
//         const { code, state } = req.query;
//         const userId = state;
//         if (!code || !userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Authorization code or user ID missing",
//             });
//         }

//         // // Exchange code for tokens
//         const { tokens } = await oauth2Client.getToken(code);
//         oauth2Client.setCredentials(tokens);

//         const gmail = google.gmail({ version: "v1", auth: oauth2Client });

//         // Get user Gmail email
//         const profile = await gmail.users.getProfile({
//             userId: "me",
//         });

//         const gmailEmail = profile.data.emailAddress;

//         // test
//         // const { error } = await supabase
//         //     .from("user_gmail_accounts")
//         //     .upsert({
//         //         user_id: "0e874433-ea14-49c1-80d1-41b8d86c3300",
//         //         gmail_email: "test@gmail.com",
//         //         access_token: "test",
//         //         refresh_token: "test",
//         //         token_expiry: new Date(),
//         //         is_active: true,
//         //         updated_at: new Date(),
//         //     });
//         console.log("gmailEmail==>", gmailEmail);
//         console.log("tokens==>", tokens);
//         const { error } = await supabase
//             .from("user_gmail_accounts")
//             .upsert({
//                 user_id: userId,
//                 gmail_email: gmailEmail,
//                 access_token: tokens.access_token,
//                 refresh_token: tokens.refresh_token,
//                 token_expiry: tokens.expiry_date
//                     ? new Date(tokens.expiry_date)
//                     : null,
//                 is_active: true,
//                 updated_at: new Date(),
//             });

//         if (error) {
//             console.log("error==>", error);
//             return res.status(500).json({
//                 success: false,
//                 message: error.message,
//             });
//         }
//         return res.status(200).json({
//             success: true,
//             message: "Gmail connected successfully",
//         });
//     } catch (error) {
//         console.error("Error connecting Gmail:", error);
//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };

