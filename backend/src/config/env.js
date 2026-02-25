import dotenv from "dotenv";
dotenv.config();

export const config = {
    PORT: process.env.PORT || 6000,
    NODE_ENV: process.env.NODE_ENV,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY: process.env.TWILIO_API_KEY,
    TWILIO_API_SECRET: process.env.TWILIO_API_SECRET,
    TWILIO_APP_SID: process.env.TWILIO_APP_SID
}
