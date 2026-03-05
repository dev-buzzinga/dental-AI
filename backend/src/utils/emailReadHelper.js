/**
 * Helpers for parsing Gmail message payloads (headers, body, attachments).
 * Used when reading email threads and formatting chat history.
 */

/**
 * Decode base64url body data from Gmail API to UTF-8 string.
 * @param {{ data?: string }} body - message part body from Gmail API
 * @returns {string}
 */
export function decodeBodyData(body) {
    const data = body?.data;
    if (!data) return "";

    try {
        const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
        return Buffer.from(normalized, "base64").toString("utf8");
    } catch {
        return "";
    }
}

/**
 * Extract plain text or HTML body from a Gmail message payload.
 * Prefers text/plain, falls back to snippet.
 * @param {object} message - full message from Gmail API (payload, snippet)
 * @returns {{ text: string, html: string }}
 */
export function extractBody(message) {
    const payload = message.payload;
    let text = "";
    let html = "";

    if (!payload) {
        return { text: message.snippet || "", html: "" };
    }

    const walkParts = (parts) => {
        for (const part of parts) {
            if (part.mimeType === "text/plain" && !part.body?.attachmentId) {
                const decoded = decodeBodyData(part.body);
                if (decoded) text = decoded;
            }
            if (part.mimeType === "text/html" && !part.body?.attachmentId) {
                const decoded = decodeBodyData(part.body);
                if (decoded) html = decoded;
            }
            if (part.parts?.length) walkParts(part.parts);
        }
    };

    if (payload.parts?.length) {
        walkParts(payload.parts);
    }

    if (!text && payload.body?.data && payload.mimeType === "text/plain") {
        text = decodeBodyData(payload.body);
    }
    if (!html && payload.body?.data && payload.mimeType === "text/html") {
        html = decodeBodyData(payload.body);
    }

    if (!text && message.snippet) text = message.snippet;
    return { text, html };
}

/**
 * Get a header value from Gmail message payload (case-insensitive).
 * @param {object} message - Gmail message with payload.headers
 * @param {string} name - header name (e.g. 'From', 'Subject')
 * @returns {string}
 */
export function getHeader(message, name) {
    const headers = message.payload?.headers || [];
    const h = headers.find((x) => (x.name || "").toLowerCase() === name.toLowerCase());
    return h?.value || "";
}

/**
 * Extract subject from message.
 * @param {object} message - Gmail message
 * @returns {string}
 */
export function extractSubject(message) {
    return getHeader(message, "subject");
}

/**
 * Parse "Name <email>" or "email" from From header.
 * @param {object} message - Gmail message
 * @returns {{ senderName: string, senderEmail: string }}
 */
export function extractSender(message) {
    const value = getHeader(message, "from");
    if (!value) return { senderName: "", senderEmail: "" };

    const match = value.match(/^(.*?)(?:\s*<(.+?)>)?$/);
    if (!match) return { senderName: "", senderEmail: value };

    const name = (match[1] || "").replace(/"/g, "").trim();
    const email = (match[2] || match[1] || "").replace(/["<>]/g, "").trim();

    return {
        senderName: name || email,
        senderEmail: email,
    };
}

/**
 * Extract attachment metadata from message (filename, mimeType, attachmentId).
 * @param {object} message - Gmail message
 * @returns {Array<{ filename: string, mimeType: string, attachmentId: string }>}
 */
export function getAttachmentsFromMessage(message) {
    const parts = message.payload?.parts || [];
    const attachments = [];

    const walkParts = (partsList) => {
        for (const part of partsList) {
            if (part.filename && part.body?.attachmentId) {
                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType || "application/octet-stream",
                    attachmentId: part.body.attachmentId,
                });
            }
            if (part.parts?.length) walkParts(part.parts);
        }
    };

    walkParts(parts);
    return attachments;
}

/**
 * Format a single Gmail message for chat history (from, date, body, attachments).
 * @param {object} message - full Gmail message from messages.get
 * @param {string} myEmail - current user's Gmail address (to show incoming vs sent)
 * @returns {object}
 */
export function formatMessageForChat(message, myEmail = "") {
    const internalDate = message.internalDate ? Number(message.internalDate) : Date.now();
    const { senderName, senderEmail } = extractSender(message);
    const { text, html } = extractBody(message);
    const subject = extractSubject(message);
    const attachments = getAttachmentsFromMessage(message);
    const toHeader = getHeader(message, "to");

    const isFromMe =
        Boolean(message.labelIds?.includes("SENT")) ||
        (Boolean(myEmail) && senderEmail.toLowerCase() === myEmail.toLowerCase());

    return {
        id: message.id,
        threadId: message.threadId,
        from: senderEmail,
        fromName: senderName,
        to: toHeader,
        subject,
        date: new Date(internalDate).toISOString(),
        snippet: message.snippet || "",
        bodyText: text,
        bodyHtml: html || null,
        isFromMe,
        attachments: attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            attachmentId: a.attachmentId,
        })),
    };
}

/**
 * Build a raw MIME message for reply (RFC 2822). Used by Gmail API send.
 * @param {object} opts
 * @param {string} opts.to - To address
 * @param {string} opts.subject - Subject (e.g. "Re: ...")
 * @param {string} [opts.inReplyTo] - Message-ID of the message we're replying to
 * @param {string} [opts.references] - References header for threading
 * @param {string} opts.bodyText - Plain text body
 * @param {string} [opts.fromEmail] - From address (optional; Gmail may override)
 * @param {Array<{ filename: string, content: string, mimeType: string }>} [opts.attachments] - Attachments (content = base64)
 * @returns {Buffer} - Raw MIME message (use base64url encode for Gmail API)
 */
export function buildReplyRawMessage(opts) {
    const {
        to,
        subject,
        inReplyTo = "",
        references = "",
        bodyText = "",
        fromEmail = "",
        attachments = [],
    } = opts;

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const lines = [];

    const push = (str) => lines.push(str);
    const crlf = "\r\n";

    // Headers
    if (fromEmail) push(`From: ${fromEmail}`);
    push(`To: ${to}`);
    push(`Subject: ${subject}`);
    if (inReplyTo) push(`In-Reply-To: ${inReplyTo}`);
    if (references) push(`References: ${references}`);
    push("MIME-Version: 1.0");

    if (attachments.length === 0) {
        push("Content-Type: text/plain; charset=UTF-8");
        push("Content-Transfer-Encoding: base64");
        push("");
        const bodyBase64 = Buffer.from(bodyText || " ", "utf8").toString("base64");
        for (let i = 0; i < bodyBase64.length; i += 76) {
            push(bodyBase64.slice(i, i + 76));
        }
    } else {
        push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        push("");

        push(`--${boundary}`);
        push("Content-Type: text/plain; charset=UTF-8");
        push("Content-Transfer-Encoding: base64");
        push("");
        const bodyBase64 = Buffer.from(bodyText || " ", "utf8").toString("base64");
        for (let i = 0; i < bodyBase64.length; i += 76) {
            push(bodyBase64.slice(i, i + 76));
        }
        push("");

        for (const att of attachments) {
            const filename = att.filename || "attachment";
            const mimeType = att.mimeType || "application/octet-stream";
            const content = typeof att.content === "string" ? att.content : Buffer.from(att.content).toString("base64");
            push(`--${boundary}`);
            push(`Content-Type: ${mimeType}; name="${filename}"`);
            push("Content-Transfer-Encoding: base64");
            push(`Content-Disposition: attachment; filename="${filename}"`);
            push("");
            for (let i = 0; i < content.length; i += 76) {
                push(content.slice(i, i + 76));
            }
            push("");
        }

        push(`--${boundary}--`);
    }

    const raw = lines.join(crlf);
    return Buffer.from(raw, "utf8");
}

/**
 * Encode buffer to base64url (Gmail API raw format).
 * @param {Buffer} buf
 * @returns {string}
 */
export function toBase64Url(buf) {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
