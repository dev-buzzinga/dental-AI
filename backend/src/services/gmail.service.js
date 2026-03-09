
import { google } from "googleapis";
import { DateTime } from "luxon";
import { config } from "../config/env.js";
import { supabase } from "../config/database.js";
import { sendEmailWithApi } from "../utils/email.js";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import {
    validateReferral,
    isAppointmentEmail,
    matchDoctorForAppointment,
    extractRequestedSlot,
    extractBookingSlots,
} from "./anthropic.service.js";
import { createGoogleEvent } from "./appointment.service.js";
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
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
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

const fetchLatestMessages = async ({ gmail, maxResults = 50, after, q }) => {
    let query = "";

    if (typeof q === "string" && q.trim()) {
        query = q.trim();
    }

    if (after) {
        const ts = Math.floor(new Date(after).getTime() / 1000);
        if (!Number.isNaN(ts)) {
            const afterFilter = `after:${ts}`;
            query = query ? `${query} ${afterFilter}` : afterFilter;
        }
    }

    const response = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: query,
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

const upsertReferralThread = async ({
    userId,
    threadId,
    lastMessage,
    lastMessageTime,
    senderName,
    senderEmail,
    receiverName,
    receiverEmail,
    subject,
}) => {
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
                receiver_name: receiverName || null,
                receiver_email: receiverEmail || null,
                subject: subject || null,
                is_new: true,
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

    const messages = await fetchLatestMessages({
        gmail,
        maxResults: 50,
        after: account.updated_at || null,
    });

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

            const subject = extractSubject(message);
            const bodyText = extractBodyText(message);
            const { senderName, senderEmail } = extractSender(message);
            const toHeader = getHeader(message, "to") || "";

            let receiverName = "";
            let receiverEmail = "";
            if (toHeader) {
                const firstRecipientRaw = toHeader.split(",")[0].trim();
                const match = firstRecipientRaw.match(/^(.*?)(?:\s*<(.+?)>)?$/);
                if (match) {
                    const name = (match[1] || "").replace(/"/g, "").trim();
                    const email = (match[2] || match[1] || "").replace(/["<>]/g, "").trim();
                    receiverName = name || email;
                    receiverEmail = email;
                }
            }

            const lastMessage = extractLastMessageSnippet(message);
            const lastMessageTime = extractInternalDate(message);

            // Check if this thread already exists in gmail_threads.
            const { data: existingThread, error: existingThreadError } = await supabase
                .from("gmail_threads")
                .select("thread_id")
                .eq("user_id", userId)
                .eq("thread_id", threadId)
                .maybeSingle();

            if (existingThreadError) {
                console.error("Error checking existing gmail_thread", {
                    userId,
                    threadId,
                    error: existingThreadError.message,
                });
            }

            if (existingThread) {
                // Already a referral thread – always sync latest info and mark as new.
                processedThreads.add(threadId);

                const { error: updateError } = await supabase
                    .from("gmail_threads")
                    .update({
                        last_message: lastMessage,
                        last_message_time: lastMessageTime,
                        sender_name: senderName || null,
                        sender_email: senderEmail || null,
                        receiver_name: receiverName || null,
                        receiver_email: receiverEmail || null,
                        subject: subject || null,
                        is_new: true,
                        last_synced_at: new Date().toISOString(),
                    })
                    .eq("user_id", userId)
                    .eq("thread_id", threadId);

                if (updateError) {
                    console.error("Failed to update existing gmail_thread", {
                        userId,
                        threadId,
                        error: updateError.message,
                    });
                }

                continue;
            }

            // New thread path: only consider if it has at least one attachment,
            // and AI marks the subject/body as a referral.
            const attachments = getAttachmentsFromMessage(message);
            if (!attachments.length) {
                continue;
            }

            processedThreads.add(threadId);

            const isReferral = await validateReferral({
                subject,
                body: bodyText,
            });

            if (!isReferral) {
                continue;
            }

            await upsertReferralThread({
                userId,
                threadId,
                lastMessage,
                lastMessageTime,
                senderName,
                senderEmail,
                receiverName,
                receiverEmail,
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

    // Update sync marker so next run only fetches newer emails
    try {
        await supabase
            .from("user_gmail_accounts")
            .update({ updated_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("is_active", true);
    } catch (err) {
        console.error("Failed to update user_gmail_accounts.updated_at", err);
    }

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

    // Fetch Gmail account's display name via Google userinfo
    let fromName = "";
    try {
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const { data: userInfo } = await oauth2.userinfo.get();
        // console.log("userInfo==>", userInfo);
        fromName = userInfo?.name || "";

    } catch (err) {
        console.warn("Could not fetch Gmail display name for reply", err.message);
    }

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
        fromName,
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

// ---------- Helpers for appointment auto-booking from email ----------

const getPracticeTimezone = async (userId) => {
    try {
        const { data, error } = await supabase
            .from("practice_details")
            .select("address")
            .eq("user_id", userId)
            .single();
        if (error) throw error;
        return data?.address?.time_zone ?? null;
    } catch (error) {
        console.error("Error fetching practice timezone for appointment cron:", error);
        return null;
    }
};

const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const match12 = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
        let h = parseInt(match12[1], 10);
        const m = parseInt(match12[2], 10);
        const period = match12[3].toUpperCase();
        if (period === "PM" && h !== 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        return h * 60 + m;
    }
    const match24 = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        const h = parseInt(match24[1], 10);
        const m = parseInt(match24[2], 10);
        return h * 60 + m;
    }
    return 0;
};

const getDayName = (dt) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dt.weekday % 7];
};

const isDoctorOnLeaveOnDate = (doctor, dateStr) => {
    const off_days = doctor.off_days || [];
    for (const item of off_days) {
        let od;
        try {
            od = typeof item === "string" ? JSON.parse(item) : item;
        } catch {
            continue;
        }
        const from = od?.from;
        const to = od?.to;
        if (!from || !to) continue;
        if (dateStr >= from && dateStr <= to) {
            return true;
        }
    }
    return false;
};

const isSlotFree = async (doctorId, startUTC, endUTC) => {
    const { data: existing, error } = await supabase
        .from("doctors_appointments")
        .select("id")
        .eq("doctor_id", doctorId)
        .lt("start_time", endUTC)
        .gt("end_time", startUTC);

    if (error) {
        console.error("Error checking appointment conflict for slot:", error);
        // On error, be conservative and treat as not free so we don't double-book.
        return false;
    }

    return !(existing && existing.length > 0);
};

const generateAvailableSlotsForDoctor = async ({
    doctor,
    userId,
    practiceTimezone,
    days = 7,
    slotMinutes = 60,
}) => {
    const weekly = doctor.weekly_availability || {};
    const tz = practiceTimezone || "UTC";
    const now = DateTime.now().setZone(tz);

    const results = [];

    for (let i = 0; i < days; i++) {
        const day = now.plus({ days: i });
        const dateStr = day.toFormat("yyyy-MM-dd");
        const dayName = getDayName(day);

        const avail = weekly[dayName];
        if (!avail || !avail.enabled) continue;

        if (isDoctorOnLeaveOnDate(doctor, dateStr)) continue;

        const slotStartMinutes = timeToMinutes(avail.start);
        const slotEndMinutes = timeToMinutes(avail.end);
        if (slotEndMinutes - slotStartMinutes < slotMinutes) continue;

        const slots = [];

        let startMinutes = slotStartMinutes;
        if (i === 0) {
            const nowMinutes = day.hour * 60 + day.minute;
            if (nowMinutes > startMinutes) {
                startMinutes = nowMinutes;
            }
        }

        for (
            let m = startMinutes;
            m + slotMinutes <= slotEndMinutes;
            m += slotMinutes
        ) {
            const startLocal = day.set({
                hour: Math.floor(m / 60),
                minute: m % 60,
                second: 0,
                millisecond: 0,
            });
            const endLocal = startLocal.plus({ minutes: slotMinutes });

            const startUTC = startLocal.toUTC().toISO();
            const endUTC = endLocal.toUTC().toISO();

            const free = await isSlotFree(doctor.id, startUTC, endUTC);
            if (!free) continue;

            slots.push({
                date: dateStr,
                weekday: dayName,
                start_local: startLocal.toFormat("HH:mm"),
                end_local: endLocal.toFormat("HH:mm"),
                startUTC,
                endUTC,
            });
        }

        if (slots.length > 0) {
            results.push({
                date: dateStr,
                weekday: dayName,
                slots,
            });
        }
    }

    console.log(
        `Calculated ${results.reduce(
            (acc, d) => acc + d.slots.length,
            0
        )} available slots for doctor`,
        { doctorId: doctor.id, userId }
    );

    return results;
};

const formatTime12h = (time) => {
    if (!time || typeof time !== "string") return time || "";
    const [hStr, mStr = "00"] = time.split(":");
    let h = parseInt(hStr, 10);
    if (Number.isNaN(h)) return time;
    const minutes = mStr.padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${minutes} ${ampm}`;
};

const formatSlotSummaryForEmail = (doctorName, slotsByDay) => {
    if (!Array.isArray(slotsByDay) || slotsByDay.length === 0) {
        return `Dr. ${doctorName} currently has no available 1-hour slots in the next 7 days. Please reply if you would like us to suggest alternative options.`;
    }

    const lines = [];
    lines.push(`Dr. ${doctorName} has the following available slots this week:`);
    lines.push(""); // blank line for readability

    for (const day of slotsByDay) {
        // Highlight day name and date as a section header
        const dateLabel = `${day.weekday.toUpperCase()} (${day.date})`;
        lines.push(dateLabel);

        // One line per slot under that day
        for (const s of day.slots) {
            const start = formatTime12h(s.start_local);
            const end = formatTime12h(s.end_local);
            lines.push(`  • ${start} - ${end}`);
        }

        lines.push(""); // blank line between days
    }

    lines.push(
        "Please reply with your preferred slot to confirm your appointment."
    );
    return lines.join("\n");
};

const formatAskPreferenceEmailBody = (doctors) => {
    const lines = [];
    lines.push("Thank you for reaching out to book an appointment.");
    lines.push("");
    lines.push("To match you with the right doctor, please reply with:");
    lines.push("- The type of treatment you need (for example: cleaning, root canal, braces, implants, whitening), and");
    lines.push("- Your preferred doctor, if you already have one.");
    lines.push("");
    lines.push("Here are our doctors and their specialties:");

    for (const doc of doctors) {
        lines.push(
            `- Dr. ${doc.name} – ${doc.specialty || "General Dentist"}`
        );
    }

    return lines.join("\n");
};

const mapBookingSlotsToAvailable = (availableSlots, bookingSlots) => {
    if (!Array.isArray(bookingSlots) || bookingSlots.length === 0) {
        return [];
    }

    const result = [];

    const toTimeString = (mins) => {
        const h = Math.floor(mins / 60)
            .toString()
            .padStart(2, "0");
        const m = (mins % 60).toString().padStart(2, "0");
        return `${h}:${m}`;
    };

    const resolveDateFromDay = (dayName) => {
        if (!dayName) return null;
        const lower = dayName.toLowerCase();
        const day = (availableSlots || []).find((d) => {
            const w = (d.weekday || "").toLowerCase();
            return w === lower || w.startsWith(lower.slice(0, 3));
        });
        return day ? day.date : null;
    };

    for (const b of bookingSlots) {
        const aiDay = (b.day || "").trim();
        const aiDate = (b.date || "").trim();
        const aiTime = (b.time || "").trim();

        let dateStr = aiDate;
        if (!dateStr) {
            dateStr = resolveDateFromDay(aiDay);
        }
        if (!dateStr) {
            return [];
        }

        const day = (availableSlots || []).find((d) => d.date === dateStr);
        if (!day) {
            return [];
        }

        const startMin = timeToMinutes(aiTime);
        if (!startMin && startMin !== 0) {
            return [];
        }

        const startStr = toTimeString(startMin);
        const endStr = toTimeString(startMin + 60);

        const slot = day.slots.find(
            (s) =>
                s.start_local === startStr && s.end_local === endStr
        );
        if (!slot) {
            return [];
        }

        result.push({
            ...slot,
            date: day.date,
            weekday: day.weekday,
        });
    }

    return result;
};

const formatNoMatchDoctorEmailBody = (doctors) => {
    const lines = [];
    lines.push(
        "We couldn't find a matching doctor for your request. Here are our available doctors:"
    );

    for (const doc of doctors) {
        lines.push(
            `- Dr. ${doc.name} (Specialty: ${doc.specialty || "General Dentist"})`
        );
    }

    lines.push(
        "Please let us know which doctor you'd prefer or describe your requirement."
    );

    return lines.join("\n");
};

const findMatchingSlot = (availableSlots, requestedSlot) => {
    if (
        !requestedSlot ||
        !requestedSlot.date ||
        !requestedSlot.start_time ||
        !requestedSlot.end_time
    ) {
        return null;
    }

    const day = (availableSlots || []).find(
        (d) => d.date === requestedSlot.date
    );
    if (!day) return null;

    const startMin = timeToMinutes(requestedSlot.start_time);
    const endMin = timeToMinutes(requestedSlot.end_time);
    const slotMinutes = 60;

    if (!startMin || !endMin || endMin <= startMin) {
        return null;
    }

    const totalMinutes = endMin - startMin;
    const count = Math.max(1, Math.floor(totalMinutes / slotMinutes));

    const slots = [];
    let current = startMin;

    const toTime = (mins) => {
        const h = Math.floor(mins / 60)
            .toString()
            .padStart(2, "0");
        const m = (mins % 60).toString().padStart(2, "0");
        return `${h}:${m}`;
    };

    for (let i = 0; i < count; i++) {
        const startStr = toTime(current);
        const endStr = toTime(current + slotMinutes);
        const slot = day.slots.find(
            (s) =>
                s.start_local === startStr && s.end_local === endStr
        );
        if (!slot) {
            return null;
        }
        slots.push({
            ...slot,
            date: day.date,
            weekday: day.weekday,
        });
        current += slotMinutes;
    }

    return slots;
};

const upsertPatientFromEmail = async ({
    userId,
    senderName,
    senderEmail,
    nextAppointmentDate,
}) => {
    try {
        const { data: existing, error: fetchError } = await supabase
            .from("patients")
            .select("*")
            .eq("user_id", userId)
            .eq("email", senderEmail)
            .maybeSingle();

        if (fetchError && fetchError.code !== "PGRST116") {
            console.error("Error fetching existing patient from email:", fetchError);
        }

        if (existing) {
            const { data: updated, error: updateError } = await supabase
                .from("patients")
                .update({
                    next_appointment: nextAppointmentDate,
                })
                .eq("id", existing.id)
                .select()
                .maybeSingle();

            if (updateError) {
                console.error("Error updating patient next_appointment:", updateError);
                throw new Error(updateError.message);
            }

            return updated || existing;
        }

        const insertPayload = {
            user_id: userId,
            name: senderName || senderEmail,
            email: senderEmail,
            gender: null,
            next_appointment: nextAppointmentDate,
        };

        const { data: inserted, error: insertError } = await supabase
            .from("patients")
            .insert(insertPayload)
            .select()
            .single();

        if (insertError) {
            console.error("Error inserting patient from email:", insertError);
            throw new Error(insertError.message);
        }

        return inserted;
    } catch (error) {
        console.error("upsertPatientFromEmail unexpected error:", error);
        throw error;
    }
};

const createAppointmentFromSlot = async ({
    userId,
    doctor,
    patient,
    slot,
    practiceTimezone,
}) => {
    const timezone = practiceTimezone || "UTC";

    const meeting_date = DateTime.fromISO(slot.startUTC, {
        zone: "utc",
    }).toFormat("yyyy-MM-dd");

    const patient_details = {
        name: patient?.name || "",
        email: patient?.email || "",
        patient_id: patient?.id || null,
    };

    const { data: appointment, error: insertError } = await supabase
        .from("doctors_appointments")
        .insert({
            user_id: userId,
            timezone,
            meeting_date,
            start_time: slot.startUTC,
            end_time: slot.endUTC,
            appointment_type_id: null,
            doctor_id: doctor.id,
            patient_details,
            notes: "Auto-booked from email",
        })
        .select()
        .single();

    if (insertError) {
        console.error("Error inserting auto-booked appointment:", insertError);
        throw new Error(insertError.message);
    }

    const eventTimezone = practiceTimezone || timezone || "UTC";

    if (doctor?.calendar_connected) {
        try {
            await createGoogleEvent(doctor, appointment, eventTimezone);
        } catch (googleError) {
            console.error(
                "Error creating Google Calendar event for auto-booked appointment:",
                googleError
            );
        }
    }

    return appointment;
};

const hasAppointmentMessageBeenProcessed = async (userId, messageId) => {
    try {
        const { data, error } = await supabase
            .from("gmail_appointment_messages")
            .select("id")
            .eq("user_id", userId)
            .eq("message_id", messageId)
            .maybeSingle();

        if (error && error.code !== "PGRST116") {
            console.error(
                "Error checking processed gmail_appointment_messages row:",
                error
            );
        }

        return !!data;
    } catch (error) {
        console.error(
            "Unexpected error checking gmail_appointment_messages:",
            error
        );
        return false;
    }
};

const markAppointmentMessageProcessed = async (userId, messageId) => {
    try {
        const { error } = await supabase
            .from("gmail_appointment_messages")
            .upsert(
                {
                    user_id: userId,
                    message_id: messageId,
                    processed_at: new Date().toISOString(),
                },
                {
                    onConflict: "user_id,message_id",
                }
            );

        if (error) {
            console.error(
                "Error marking gmail appointment message as processed:",
                error
            );
        }
    } catch (error) {
        console.error(
            "Unexpected error marking gmail appointment message processed:",
            error
        );
    }
};

const markGmailMessageAsRead = async ({ gmail, messageId }) => {
    try {
        await gmail.users.messages.modify({
            userId: "me",
            id: messageId,
            requestBody: {
                removeLabelIds: ["UNREAD"],
            },
        });
    } catch (error) {
        console.error("Error marking Gmail message as read:", {
            messageId,
            error: error.message,
        });
    }
};

const processAppointmentEmailsForAccount = async (account) => {
    const userId = account.user_id;

    console.log("Processing Gmail appointment emails for user", {
        userId,
        gmail_email: account.gmail_email,
    });

    if (!account.is_active) {
        console.log("Skipping inactive Gmail account for user", userId);
        return;
    }

    const updatedAccount = await refreshAccessTokenIfNeeded(account);
    const gmail = getGmailClient(updatedAccount.access_token);

    const messages = await fetchLatestMessages({
        gmail,
        maxResults: 50,
        q: "is:unread",
    });

    console.log(
        `Fetched ${messages.length} unread Gmail messages for appointment scanning`,
    );

    for (const messageMeta of messages) {
        const messageId = messageMeta.id;

        try {
            if (await hasAppointmentMessageBeenProcessed(userId, messageId)) {
                continue;
            }

            const message = await getMessageDetails({
                gmail,
                messageId,
            });

            // Once we've fetched the message in our system, mark it as read in Gmail
            await markGmailMessageAsRead({ gmail, messageId });

            const subject = extractSubject(message);
            const bodyText = extractBodyText(message);
            const { senderName, senderEmail } = extractSender(message);
            const threadId = message.threadId;

            if (!subject && !bodyText) {
                await markAppointmentMessageProcessed(userId, messageId);
                continue;
            }

            const isAppt = await isAppointmentEmail({
                subject,
                body: bodyText,
            });

            if (!isAppt) {
                await markAppointmentMessageProcessed(userId, messageId);
                continue;
            }

            console.log("Detected appointment-related email", {
                userId,
                messageId,
                subject,
            });

            const { data: doctors, error: doctorsError } = await supabase
                .from("doctors")
                .select(
                    "id, user_id, name, specialty, services, weekly_availability, off_days, calendar_connected"
                )
                .eq("user_id", userId);

            if (doctorsError) {
                console.error(
                    "Error fetching doctors for appointment email processing:",
                    doctorsError
                );
                await markAppointmentMessageProcessed(userId, messageId);
                continue;
            }

            if (!doctors || doctors.length === 0) {
                console.warn(
                    "No doctors configured for user when processing appointment email",
                    { userId }
                );
                try {
                    const body =
                        "⚠️ We couldn't find any doctors configured in this dental practice yet. Please contact the clinic directly to schedule your appointment.";
                    await sendReply(userId, threadId, { body });
                } catch (err) {
                    console.error(
                        "Failed to send no-doctors reply for appointment email:",
                        err
                    );
                }
                await markAppointmentMessageProcessed(userId, messageId);
                continue;
            }

            const doctorsForAI = doctors.map((d) => ({
                name: d.name,
                specialty: d.specialty || "",
                services: Array.isArray(d.services) ? d.services : [],
            }));

            const matchedName = await matchDoctorForAppointment({
                subject,
                body: bodyText,
                doctors: doctorsForAI,
            });
            console.log("matchedName==> by AI==>", matchedName);

            if (matchedName === "ASK_PREFERENCE") {
                try {
                    const body = formatAskPreferenceEmailBody(doctors);
                    await sendReply(userId, threadId, { body });
                } catch (err) {
                    console.error(
                        "Failed to send ASK_PREFERENCE doctor reply:",
                        err
                    );
                }
                await markAppointmentMessageProcessed(userId, messageId);
                continue;
            }

            const matchedDoctor =
                matchedName && matchedName !== "NO_MATCH"
                    ? doctors.find(
                        (d) =>
                            d.name &&
                            d.name.toLowerCase() ===
                            matchedName.toLowerCase()
                    )
                    : null;

            if (!matchedDoctor) {
                try {
                    const body = formatNoMatchDoctorEmailBody(doctors);
                    await sendReply(userId, threadId, { body });
                } catch (err) {
                    console.error(
                        "Failed to send NO_MATCH doctor reply:",
                        err
                    );
                }
                await markAppointmentMessageProcessed(userId, messageId);
                continue;
            }

            const practiceTimezone = await getPracticeTimezone(userId);

            const availableSlots = await generateAvailableSlotsForDoctor({
                doctor: matchedDoctor,
                userId,
                practiceTimezone,
                days: 7,
                slotMinutes: 60,
            });

            if (!availableSlots || availableSlots.length === 0) {
                try {
                    const body = `Dr. ${matchedDoctor.name} currently has no available 1-hour slots in the next 7 days. Please reply if you would like us to suggest alternative options.`;
                    await sendReply(userId, threadId, { body });
                } catch (err) {
                    console.error(
                        "Failed to send no-availability reply for appointment email:",
                        err
                    );
                }
                await markAppointmentMessageProcessed(userId, messageId);
                continue;
            }

            // First, try advanced extraction of one-hour booking slots (can return multiple)
            let chosenSlots = [];
            try {
                const bookingSlots = await extractBookingSlots(subject, bodyText);
                if (Array.isArray(bookingSlots) && bookingSlots.length > 0) {
                    chosenSlots = mapBookingSlotsToAvailable(
                        availableSlots,
                        bookingSlots
                    );
                }
            } catch (err) {
                console.error(
                    "Error in extractBookingSlots, falling back to simple range:",
                    err
                );
            }

            // Fallback: single range (start_time/end_time) via extractRequestedSlot
            if (!chosenSlots || chosenSlots.length === 0) {
                const requestedSlot = await extractRequestedSlot({
                    body: bodyText,
                    practiceTimezone: practiceTimezone || "UTC",
                });

                if (!requestedSlot) {
                    const body = formatSlotSummaryForEmail(
                        matchedDoctor.name,
                        availableSlots
                    );
                    try {
                        await sendReply(userId, threadId, { body });
                    } catch (err) {
                        console.error(
                            "Failed to send slot suggestion reply:",
                            err
                        );
                    }
                    await markAppointmentMessageProcessed(userId, messageId);
                    continue;
                }

                chosenSlots = findMatchingSlot(availableSlots, requestedSlot);
            }

            if (!chosenSlots || !Array.isArray(chosenSlots) || chosenSlots.length === 0) {
                const body = [
                    "⚠️ Unfortunately, the requested time slot(s) are not available this week",
                    "Here are the currently available slots:",
                    "",
                    formatSlotSummaryForEmail(
                        matchedDoctor.name,
                        availableSlots
                    ),
                ].join("\n");

                try {
                    await sendReply(userId, threadId, { body });
                } catch (err) {
                    console.error(
                        "Failed to send updated slot suggestion reply:",
                        err
                    );
                }

                await markAppointmentMessageProcessed(userId, messageId);
                continue;
            }

            // Use the first slot's date as the patient's next_appointment
            const firstSlot = chosenSlots[0];
            const lastSlot = chosenSlots[chosenSlots.length - 1];

            let patient;
            try {
                patient = await upsertPatientFromEmail({
                    userId,
                    senderName,
                    senderEmail,
                    nextAppointmentDate: firstSlot.date,
                });
            } catch (error) {
                console.error(
                    "Failed to upsert patient from appointment email:",
                    error
                );
                await markAppointmentMessageProcessed(userId, messageId);
                continue;
            }

            // Create one appointment per requested 1-hour slot (for ranges like 3 PM–5 PM)
            const createdAppointments = [];
            try {
                for (const slot of chosenSlots) {
                    const appt = await createAppointmentFromSlot({
                        userId,
                        doctor: matchedDoctor,
                        patient,
                        slot,
                        practiceTimezone,
                    });
                    createdAppointments.push(appt);
                }
            } catch (error) {
                console.error(
                    "Failed to create one or more appointments from email slots:",
                    error
                );
                await markAppointmentMessageProcessed(userId, messageId);
                continue;
            }

            try {
                const bodyLines = [
                    "✅ Your appointment has been successfully booked!",
                    "",
                    `Doctor: Dr. ${matchedDoctor.name}`,
                    `Date: ${firstSlot.date}`,
                    `Time: ${formatTime12h(firstSlot.start_local)} - ${formatTime12h(lastSlot.end_local)}`,
                    "",
                    "We look forward to seeing you.",
                ];
                await sendReply(userId, threadId, {
                    body: bodyLines.join("\n"),
                });
            } catch (err) {
                console.error(
                    "Failed to send appointment confirmation email reply:",
                    err
                );
            }

            console.log("Auto-booked appointment from email", {
                userId,
                doctorId: matchedDoctor.id,
                patientId: patient?.id,
                appointmentId: appointment?.id,
            });

            await markAppointmentMessageProcessed(userId, messageId);
        } catch (error) {
            console.error(
                "Error processing Gmail message for appointments",
                {
                    userId,
                    messageId,
                    error: error.message,
                }
            );

            try {
                await markAppointmentMessageProcessed(userId, messageId);
            } catch {
                // ignore
            }
        }
    }
};

/**
 * Top-level cron entrypoint: scan all users with active Gmail connections
 * and process their unread emails for appointment auto-booking.
 */
export const processAppointmentEmailsCron = async () => {
    console.log("Starting appointment email cron run");

    try {
        const { data: accounts, error } = await supabase
            .from("user_gmail_accounts")
            .select("*")
            .eq("is_active", true);

        if (error) {
            console.error(
                "Error fetching user_gmail_accounts for appointment cron:",
                error
            );
            return;
        }

        if (!accounts || accounts.length === 0) {
            console.log(
                "No active Gmail accounts found for appointment cron run."
            );
            return;
        }
        console.log("1 start accounts.length=>", accounts.length);
        for (const account of accounts) {
            try {
                await processAppointmentEmailsForAccount(account);
            } catch (error) {
                console.error(
                    "Error in per-account appointment processing:",
                    {
                        userId: account.user_id,
                        error: error.message,
                    }
                );
            }
        }

        console.log("Appointment email cron run completed.");
    } catch (error) {
        console.error("Unexpected error in appointment email cron:", error);
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

