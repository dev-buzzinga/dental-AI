import { config } from "../config/env.js";
import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: config.ANTHROPIC_API_KEY,
});

export const validateReferral = async ({ subject, body }) => {
    // console.log("validateReferral");
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

