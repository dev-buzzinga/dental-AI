
import { google } from "googleapis";
import { config } from "../config/env.js";
import { supabase } from "../config/database.js";
import { sendEmailWithApi } from "../utils/email.js";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import { validateReferral } from "./anthropic.service.js";
import {
    formatMessageForChat,
    getAttachmentsFromMessage,
    getHeader,
    buildReplyRawMessage,
    toBase64Url,
} from "../utils/emailReadHelper.js";

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

        const result = await sendEmailWithApi({
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
            url,
        });
    } catch (error) {
        console.error("Error connecting to Gmail:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getUserGmailAccount = async (userId) => {
    const { data, error } = await supabase
        .from("user_gmail_accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

const refreshAccessTokenIfNeeded = async (account) => {
    const now = new Date();
    const expiry = account.token_expiry ? new Date(account.token_expiry) : null;

    if (expiry && expiry > new Date(now.getTime() + 60 * 1000)) {
        return account;
    }

    if (!account.refresh_token) {
        console.warn("No refresh token available for Gmail account", account.user_id);
        return account;
    }

    oauth2Client.setCredentials({
        refresh_token: account.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    // console.log("credentials==>", credentials);
    const updated = {
        ...account,
        access_token: credentials.access_token,
        token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
    };

    const { error: upsertError } = await supabase
        .from("user_gmail_accounts")
        .upsert(
            {
                user_id: account.user_id,
                gmail_email: account.gmail_email,
                access_token: updated.access_token,
                refresh_token: account.refresh_token,
                token_expiry: updated.token_expiry,
                is_active: true,
                updated_at: new Date(),
            },
            {
                onConflict: "user_id",
            }
        );

    if (upsertError) {
        console.error("Failed to update refreshed Gmail tokens", upsertError);
    }

    return updated;
};

const getGmailClient = (accessToken) => {
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.gmail({ version: "v1", auth: oauth2Client });
};

const fetchLatestMessages = async ({ gmail, maxResults = 50 }) => {
    const response = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: "", // can optimize with search query later
    });

    const messages = response.data.messages || [];
    return messages;
};

const getMessageDetails = async ({ gmail, messageId, format = "full" }) => {
    const response = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format,
    });

    return response.data;
};

const downloadAttachment = async ({ gmail, messageId, attachmentId }) => {
    const res = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: attachmentId,
    });

    return res.data?.data || null;
};

const extractLastMessageSnippet = (message) => {
    return message.snippet || "";
};

const extractInternalDate = (message) => {
    const ts = message.internalDate ? Number(message.internalDate) : Date.now();
    return new Date(ts).toISOString();
};

const extractSubject = (message) => {
    const headers = message.payload?.headers || [];
    const subjectHeader = headers.find(
        (h) => (h.name || "").toLowerCase() === "subject"
    );
    return subjectHeader?.value || "";
};

const extractSender = (message) => {
    const headers = message.payload?.headers || [];
    const fromHeader = headers.find(
        (h) => (h.name || "").toLowerCase() === "from"
    );

    if (!fromHeader?.value) {
        return { senderName: "", senderEmail: "" };
    }

    const value = fromHeader.value;

    const match = value.match(/^(.*?)(?:\s*<(.+?)>)?$/);
    if (!match) {
        return { senderName: "", senderEmail: value };
    }

    const name = (match[1] || "").replace(/"/g, "").trim();
    const email = (match[2] || match[1] || "").replace(/["<>]/g, "").trim();

    return {
        senderName: name || email,
        senderEmail: email,
    };
};

const decodeBodyData = (body) => {
    const data = body?.data;
    if (!data) return "";

    try {
        const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
        return Buffer.from(normalized, "base64").toString("utf8");
    } catch {
        return "";
    }
};

const extractBodyText = (message) => {
    const payload = message.payload;
    if (!payload) return "";

    if (payload.parts && payload.parts.length) {
        const stack = [...payload.parts];
        while (stack.length) {
            const part = stack.shift();
            if (part.mimeType === "text/plain" && !part.body?.attachmentId) {
                const text = decodeBodyData(part.body);
                if (text) return text;
            }
            if (part.parts && part.parts.length) {
                stack.push(...part.parts);
            }
        }
    }

    if (payload.body && payload.mimeType === "text/plain") {
        const text = decodeBodyData(payload.body);
        if (text) return text;
    }

    return message.snippet || "";
};

const upsertReferralThread = async ({ userId, threadId, lastMessage, lastMessageTime, senderName, senderEmail, subject }) => {
    const { error } = await supabase
        .from("gmail_threads")
        .upsert(
            {
                user_id: userId,
                thread_id: threadId,
                last_message: lastMessage,
                last_message_time: lastMessageTime,
                sender_name: senderName || null,
                sender_email: senderEmail || null,
                subject: subject || null,
                last_synced_at: new Date().toISOString(),
            },
            {
                onConflict: "user_id,thread_id",
            }
        );

    if (error) {
        console.error("Failed to upsert gmail_threads", error);
        throw new Error(error.message);
    }
};

const listReferralThreads = async (userId) => {
    const { data, error } = await supabase
        .from("gmail_threads")
        .select("*")
        .eq("user_id", userId)
        .order("last_message_time", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};

export const fetchReferralEmails = async (userId) => {
    console.log("Fetching referral emails for user", userId);

    const account = await getUserGmailAccount(userId);

    if (!account || !account.is_active) {
        throw new Error("Gmail is not connected for this user");
    }

    const updatedAccount = await refreshAccessTokenIfNeeded(account);

    const gmail = getGmailClient(updatedAccount.access_token);

    const messages = await fetchLatestMessages({ gmail, maxResults: 50 });

    console.log(`Fetched ${messages.length} recent Gmail messages for referral scanning`);

    const processedThreads = new Set();

    const limitedMessages = messages.slice(0, 50);

    for (const messageMeta of limitedMessages) {
        try {
            const message = await getMessageDetails({
                gmail,
                messageId: messageMeta.id,
            });

            const threadId = message.threadId;

            if (processedThreads.has(threadId)) {
                continue;
            }

            const attachments = getAttachmentsFromMessage(message);

            if (!attachments.length) {
                continue;
            }

            processedThreads.add(threadId);

            const first = attachments[0];

            const base64Content = await downloadAttachment({
                gmail,
                messageId: message.id,
                attachmentId: first.attachmentId,
            });

            if (!base64Content) {
                continue;
            }

            const subject = extractSubject(message);
            const bodyText = extractBodyText(message);
            const { senderName, senderEmail } = extractSender(message);

            const isReferral = await validateReferral({
                filename: first.filename,
                mimeType: first.mimeType,
                base64Content,
                subject,
                body: bodyText,
            });

            if (!isReferral) {
                continue;
            }

            const lastMessage = extractLastMessageSnippet(message);
            const lastMessageTime = extractInternalDate(message);

            await upsertReferralThread({
                userId,
                threadId,
                lastMessage,
                lastMessageTime,
                senderName,
                senderEmail,
                subject,
            });
        } catch (error) {
            console.error("Error processing Gmail message for referrals", {
                userId,
                messageId: messageMeta.id,
                error: error.message,
            });
        }
    }

    const threads = await listReferralThreads(userId);

    return threads;
};

export const listGmailThreads = async (userId) => {
    return await listReferralThreads(userId);
};

/**
 * Get full thread with all messages for chat history.
 * Uses user's stored tokens (refresh_token/access_token) from DB.
 */
export const getThreadHistory = async (userId, threadId) => {
    const account = await getUserGmailAccount(userId);
    if (!account?.is_active) {
        throw new Error("Gmail is not connected for this user");
    }

    const updatedAccount = await refreshAccessTokenIfNeeded(account);
    const gmail = getGmailClient(updatedAccount.access_token);

    const threadRes = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
    });

    const thread = threadRes.data;
    const messageIds = (thread.messages || []).map((m) => m.id);

    const messages = [];
    for (const messageId of messageIds) {
        const message = await getMessageDetails({ gmail, messageId });
        const formatted = formatMessageForChat(message, updatedAccount.gmail_email || "");
        messages.push(formatted);
    }

    // Sort by date ascending for chat order
    messages.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
        threadId,
        subject: messages[0]?.subject || "",
        messages,
    };
};

/**
 * Get attachment content for a message. Returns base64 data + metadata for download/view.
 * NOTE: Gmail API returns a different attachmentId on every messages.get call,
 * so we match by filename instead and use the fresh attachmentId to download.
 */
export const getAttachment = async (userId, messageId, filename) => {
    const account = await getUserGmailAccount(userId);
    if (!account?.is_active) {
        throw new Error("Gmail is not connected for this user");
    }

    const updatedAccount = await refreshAccessTokenIfNeeded(account);
    const gmail = getGmailClient(updatedAccount.access_token);

    const message = await getMessageDetails({ gmail, messageId });
    const attachments = getAttachmentsFromMessage(message);

    // Match by filename since attachmentId changes on every API call
    const attachment = attachments.find((a) => a.filename === filename);
    if (!attachment) {
        throw new Error("Attachment not found");
    }

    // Use the FRESH attachmentId from re-fetched message
    const data = await downloadAttachment({ gmail, messageId, attachmentId: attachment.attachmentId });
    return {
        data,
        filename: attachment.filename,
        mimeType: attachment.mimeType || "application/octet-stream",
    };
};

/**
 * Send a reply in an email thread. Uses thread's last message for In-Reply-To/References.
 * @param {string} userId
 * @param {string} threadId
 * @param {{ body: string, attachments?: Array<{ filename: string, content: string, mimeType?: string }> }} payload - body = plain text; attachments: content is base64
 * @returns {{ messageId: string, threadId: string }}
 */
export const sendReply = async (userId, threadId, payload) => {
    const account = await getUserGmailAccount(userId);
    if (!account?.is_active) {
        throw new Error("Gmail is not connected for this user");
    }

    const updatedAccount = await refreshAccessTokenIfNeeded(account);
    const gmail = getGmailClient(updatedAccount.access_token);
    const myEmail = updatedAccount.gmail_email || "";

    const threadRes = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
    });
    const thread = threadRes.data;
    const messageIds = (thread.messages || []).map((m) => m.id);
    if (!messageIds.length) {
        throw new Error("Thread has no messages");
    }

    const lastMessageId = messageIds[messageIds.length - 1];
    const lastMessage = await getMessageDetails({ gmail, messageId: lastMessageId });

    const messageIdHeader = getHeader(lastMessage, "Message-ID");
    const referencesHeader = getHeader(lastMessage, "References");
    const references = referencesHeader ? `${referencesHeader} ${messageIdHeader}`.trim() : messageIdHeader || "";

    let subject = extractSubject(lastMessage);
    if (subject && !/^re:\s/i.test(subject)) {
        subject = `Re: ${subject}`;
    }

    const { senderEmail } = extractSender(lastMessage);
    const toHeader = getHeader(lastMessage, "To");
    const isLastFromMe = lastMessage.labelIds?.includes("SENT") || (myEmail && senderEmail.toLowerCase() === myEmail.toLowerCase());
    const replyTo = isLastFromMe
        ? (toHeader || "").split(",")[0].trim()
        : (getHeader(lastMessage, "From") || senderEmail || "");

    if (!replyTo) {
        throw new Error("Could not determine reply-to address");
    }

    const rawBuffer = buildReplyRawMessage({
        to: replyTo,
        subject: subject || "Re: (no subject)",
        inReplyTo: messageIdHeader || undefined,
        references: references || undefined,
        bodyText: payload.body || "",
        fromEmail: myEmail,
        attachments: payload.attachments || [],
    });

    const rawBase64Url = toBase64Url(rawBuffer);

    const sendRes = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
            raw: rawBase64Url,
            threadId,
        },
    });

    return {
        messageId: sendRes.data.id,
        threadId: sendRes.data.threadId || threadId,
    };
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

