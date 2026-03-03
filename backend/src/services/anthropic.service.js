import { config } from "../config/env.js";
import axios from "axios";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export const validateReferral = async ({ filename, mimeType, base64Content, subject, body }) => {
    if (!config.ANTHROPIC_API_KEY) {
        console.warn("Anthropic API key is not configured. Skipping referral validation.");
        return false;
    }

    try {
        const prompt = `
You are a classifier for dental referral emails and their attachments.

You will be given:
- The email subject
- The email body text
- Metadata about an attached file
- The base64 content of that attachment

Determine whether this email + attachment represents a DENTAL REFERRAL document (e.g., a dentist or doctor referring a patient to another provider, including patient name, referring provider, reason for referral, etc).

Respond with a single JSON object, no extra text:
{ "is_referral": true | false }
`;

        const response = await axios.post(
            ANTHROPIC_API_URL,
            {
                model: "claude-sonnet-4-20250514",
                max_tokens: 64,
                temperature: 0,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt,
                            },
                            {
                                type: "text",
                                text: `Email subject:\n${subject || ""}`,
                            },
                            {
                                type: "text",
                                text: `Email body:\n${body || ""}`,
                            },
                            {
                                type: "text",
                                text: `Attachment metadata:\nFilename: ${filename || "unknown"}\nMIME type: ${mimeType || "unknown"}`,
                            },
                            {
                                type: "text",
                                text: `Attachment base64 content (truncated):\n${base64Content?.slice(0, 8000) || ""}`,
                            },
                        ],
                    },
                ],
            },
            {
                headers: {
                    "x-api-key": config.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                timeout: 20000,
            }
        );

        const text = response.data?.content?.[0]?.text || "";

        try {
            const parsed = JSON.parse(text);
            return Boolean(parsed.is_referral);
        } catch {
            const lowered = text.toLowerCase();
            return lowered.includes('"is_referral": true') || lowered.includes("is_referral: true");
        }
    } catch (error) {
        console.error("Anthropic validateReferral error:", error?.response?.data || error.message);
        return false;
    }
};

