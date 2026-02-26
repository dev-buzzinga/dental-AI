// import twilio from "twilio";
import { config } from "../config/env.js";

// const AccessToken = twilio.jwt.AccessToken;
// const VoiceGrant = AccessToken.VoiceGrant;

export const generateToken = (identity) => {
    const token = new AccessToken(
        config.TWILIO_ACCOUNT_SID,
        config.TWILIO_API_KEY,
        config.TWILIO_API_SECRET,
        { identity }
    );

    const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: config.TWILIO_APP_SID,
        incomingAllow: true,
    });

    token.addGrant(voiceGrant);

    return token.toJwt();
};