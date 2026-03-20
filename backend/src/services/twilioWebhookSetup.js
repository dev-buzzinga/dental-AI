import twilio from "twilio";
import { supabase } from "../config/database.js";
import { config } from "../config/env.js";

/**
 * Fetch Twilio credentials from database for a given user
 * @param {string} user_id - User ID
 * @returns {Promise<Object>} Twilio credentials
 */
const getTwilioCredentials = async (user_id) => {
    try {
        const { data, error } = await supabase
            .from('twilio_config')
            .select('account_sid, auth_token, app_sid, intelligence_service_sid')
            .eq('user_id', user_id)
            .single();

        if (error || !data) {
            throw new Error("Twilio configuration not found in database");
        }

        if (!data.account_sid || !data.auth_token) {
            throw new Error("Twilio Account SID and Auth Token are required");
        }

        return data;
    } catch (error) {
        throw new Error(`Failed to fetch Twilio credentials: ${error.message}`);
    }
};

/**
 * Check and update TwiML App webhooks
 * @param {Object} client - Twilio client
 * @param {string} appSid - TwiML App SID
 * @returns {Promise<Object>} Update result
 */
const updateTwiMLAppWebhooks = async (client, appSid) => {
    try {
        if (!appSid) {
            console.log("⚠️  No TwiML App SID provided, skipping TwiML App webhook setup");
            return { success: false, skipped: true, message: "No App SID configured" };
        }

        // const expectedVoiceUrl = `${config.BASE_URL}/api/incoming-call/voice`;
        // const expectedStatusCallback = `${config.BASE_URL}/api/outgoing-call/transcription-status`;
        const expectedVoiceUrl = `${config.BASE_URL}/api/outgoing-call/voice`;
        const expectedStatusCallback = `${config.BASE_URL}/api/outgoing-call/status-callback`;

        console.log(`🔍 Checking TwiML App: ${appSid}`);

        // Fetch existing TwiML App
        const app = await client.applications(appSid).fetch();

        let needsUpdate = false;
        const updates = {};

        // Check if voiceUrl needs update
        if (app.voiceUrl !== expectedVoiceUrl) {
            console.log(`   Voice URL needs update: ${app.voiceUrl} → ${expectedVoiceUrl}`);
            updates.voiceUrl = expectedVoiceUrl;
            updates.voiceMethod = 'POST';
            needsUpdate = true;
        } else {
            console.log(`   ✓ Voice URL already correct`);
        }

        // Check if statusCallback needs update
        if (app.statusCallback !== expectedStatusCallback) {
            console.log(`   Status Callback needs update: ${app.statusCallback} → ${expectedStatusCallback}`);
            updates.statusCallback = expectedStatusCallback;
            updates.statusCallbackMethod = 'POST';
            needsUpdate = true;
        } else {
            console.log(`   ✓ Status Callback already correct`);
        }

        // Update if needed
        if (needsUpdate) {
            await client.applications(appSid).update(updates);
            console.log(`✅ TwiML App webhooks updated successfully`);
            return { success: true, updated: true, message: "TwiML App webhooks updated" };
        } else {
            console.log(`✅ TwiML App webhooks already configured correctly`);
            return { success: true, updated: false, message: "TwiML App webhooks already correct" };
        }

    } catch (error) {
        console.error(`❌ Error updating TwiML App webhooks:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Check and update Active Phone Number webhooks
 * @param {Object} client - Twilio client
 * @param {string} phoneNumberSid - Phone Number SID
 * @returns {Promise<Object>} Update result
 */
const updatePhoneNumberWebhooks = async (client, phoneNumberSid) => {
    try {
        if (!phoneNumberSid) {
            console.log("⚠️  No Phone Number SID provided, skipping phone number webhook setup");
            return { success: false, skipped: true, message: "No Phone Number SID provided" };
        }

        const expectedVoiceUrl = `${config.BASE_URL}/api/incoming-call/voice`;
        const expectedStatusCallback = `${config.BASE_URL}/api/incoming-call/status-callback`;

        console.log(`🔍 Checking Phone Number: ${phoneNumberSid}`);

        // Fetch existing phone number
        const phoneNumber = await client.incomingPhoneNumbers(phoneNumberSid).fetch();

        let needsUpdate = false;
        const updates = {};

        // Check if voiceUrl needs update
        if (phoneNumber.voiceUrl !== expectedVoiceUrl) {
            console.log(`   Voice URL needs update: ${phoneNumber.voiceUrl} → ${expectedVoiceUrl}`);
            updates.voiceUrl = expectedVoiceUrl;
            updates.voiceMethod = 'POST';
            needsUpdate = true;
        } else {
            console.log(`   ✓ Voice URL already correct`);
        }

        // Check if statusCallback needs update
        if (phoneNumber.statusCallback !== expectedStatusCallback) {
            console.log(`   Status Callback needs update: ${phoneNumber.statusCallback} → ${expectedStatusCallback}`);
            updates.statusCallback = expectedStatusCallback;
            updates.statusCallbackMethod = 'POST';
            needsUpdate = true;
        } else {
            console.log(`   ✓ Status Callback already correct`);
        }

        // Update if needed
        if (needsUpdate) {
            await client.incomingPhoneNumbers(phoneNumberSid).update(updates);
            console.log(`✅ Phone Number webhooks updated successfully`);
            return { success: true, updated: true, message: "Phone number webhooks updated" };
        } else {
            console.log(`✅ Phone Number webhooks already configured correctly`);
            return { success: true, updated: false, message: "Phone number webhooks already correct" };
        }

    } catch (error) {
        console.error(`❌ Error updating Phone Number webhooks:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Check and update Intelligence Service webhooks
 * @param {Object} client - Twilio client
 * @param {string} intelligenceServiceSid - Intelligence Service SID
 * @returns {Promise<Object>} Update result
 */
const updateIntelligenceServiceWebhooks = async (client, intelligenceServiceSid) => {
    try {
        if (!intelligenceServiceSid) {
            console.log("⚠️  No Intelligence Service SID provided, skipping intelligence webhook setup");
            return { success: false, skipped: true, message: "No Intelligence Service SID configured" };
        }

        const expectedWebhookUrl = `${config.BASE_URL}/api/outgoing-call/transcription-status`;
        const expectedWebhookMethod = 'GET';

        console.log(`🔍 Checking Intelligence Service: ${intelligenceServiceSid}`);

        // Fetch existing Intelligence Service
        const service = await client.intelligence.v2.services(intelligenceServiceSid).fetch();

        let needsUpdate = false;
        const updates = {};

        // Check if webhookUrl needs update
        if (service.webhookUrl !== expectedWebhookUrl) {
            console.log(`   Webhook URL needs update: ${service.webhookUrl} → ${expectedWebhookUrl}`);
            updates.webhookUrl = expectedWebhookUrl;
            needsUpdate = true;
        } else {
            console.log(`   ✓ Webhook URL already correct`);
        }

        // Check if webhookHttpMethod needs update
        if (service.webhookHttpMethod !== expectedWebhookMethod) {
            console.log(`   Webhook Method needs update: ${service.webhookHttpMethod} → ${expectedWebhookMethod}`);
            updates.webhookHttpMethod = expectedWebhookMethod;
            needsUpdate = true;
        } else {
            console.log(`   ✓ Webhook HTTP Method already correct`);
        }

        // Update if needed
        if (needsUpdate) {
            await client.intelligence.v2.services(intelligenceServiceSid).update(updates);
            console.log(`✅ Intelligence Service webhooks updated successfully`);
            return { success: true, updated: true, message: "Intelligence Service webhooks updated" };
        } else {
            console.log(`✅ Intelligence Service webhooks already configured correctly`);
            return { success: true, updated: false, message: "Intelligence Service webhooks already correct" };
        }

    } catch (error) {
        console.error(`❌ Error updating Intelligence Service webhooks:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Main function to setup all Twilio webhooks
 * Called whenever a user adds or changes their phone number
 * 
 * @param {string} user_id - User ID (to fetch credentials from DB)
 * @param {string} phoneNumberSid - Phone Number SID (optional, e.g., "PNxxxx...")
 * @returns {Promise<Object>} Result object with success status and details
 */
export const setupTwilioWebhooks = async (user_id, phoneNumberSid = null) => {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 Starting Twilio Webhook Auto-Setup");
    console.log("=".repeat(60));

    const results = {
        twimlApp: null,
        phoneNumber: null,
        intelligenceService: null,
    };

    try {
        // Step 1: Fetch Twilio credentials from database
        console.log("\n📦 Step 1: Fetching Twilio credentials from database...");
        const credentials = await getTwilioCredentials(user_id);
        console.log(`   ✓ Credentials fetched for user: ${user_id}`);

        // Step 2: Initialize Twilio client with DB credentials
        console.log("\n🔧 Step 2: Initializing Twilio client...");
        const client = twilio(credentials.account_sid, credentials.auth_token);
        console.log(`   ✓ Twilio client initialized`);

        // Step 3: Update TwiML App webhooks
        console.log("\n📱 Step 3: Updating TwiML App webhooks...");
        results.twimlApp = await updateTwiMLAppWebhooks(client, credentials.app_sid);

        // Step 4: Update Phone Number webhooks (if phoneNumberSid provided)
        console.log("\n📞 Step 4: Updating Phone Number webhooks...");
        results.phoneNumber = await updatePhoneNumberWebhooks(client, phoneNumberSid);

        // Step 5: Update Intelligence Service webhooks
        console.log("\n🧠 Step 5: Updating Intelligence Service webhooks...");
        results.intelligenceService = await updateIntelligenceServiceWebhooks(
            client,
            credentials.intelligence_service_sid
        );

        // Summary
        console.log("\n" + "=".repeat(60));
        console.log("✅ Webhook Auto-Setup Complete");
        console.log("=".repeat(60));

        const allSuccessful =
            (results.twimlApp?.success || results.twimlApp?.skipped) &&
            (results.phoneNumber?.success || results.phoneNumber?.skipped) &&
            (results.intelligenceService?.success || results.intelligenceService?.skipped);

        return {
            success: allSuccessful,
            message: allSuccessful
                ? "All webhook configurations verified/updated successfully"
                : "Some webhook configurations failed - check logs for details",
            details: results,
            twimlAppSid: credentials.app_sid,
        };

    } catch (error) {
        console.error("\n❌ Fatal error during webhook setup:", error.message);
        console.log("=".repeat(60) + "\n");

        return {
            success: false,
            message: `Webhook setup failed: ${error.message}`,
            details: results,
            error: error.message,
        };
    }
};

/**
 * Service function for Express route handler
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const setupWebhooksService = async (req, res) => {
    try {
        const user_id = req.user?.id;
        const { phoneNumberSid } = req.body;
        // console.log(`setupWebhooksService: phoneNumberSid: ${phoneNumberSid}`);
        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: "User authentication required",
            });
        }

        const result = await setupTwilioWebhooks(user_id, phoneNumberSid);

        return res.status(result.success ? 200 : 500).json(result);

    } catch (error) {
        console.error("Error in setupWebhooksService:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
