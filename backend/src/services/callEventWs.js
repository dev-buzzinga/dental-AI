import { WebSocketServer } from "ws";

// userId → Set<WebSocket>  (supports multiple tabs)
const callEventClients = new Map();

let callEventsWss = null;

/**
 * Create and return the call-events WebSocket server (noServer mode).
 * server.js handles the HTTP upgrade routing.
 */
export const initCallEventsWs = () => {
    callEventsWss = new WebSocketServer({ noServer: true });

    callEventsWss.on('connection', (ws, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            ws.close(1008, 'Missing userId');
            return;
        }

        // Register this client
        if (!callEventClients.has(userId)) {
            callEventClients.set(userId, new Set());
        }
        callEventClients.get(userId).add(ws);
        console.log(`📡 Call-events WS connected for user: ${userId}`);

        ws.on('close', () => {
            const clients = callEventClients.get(userId);
            if (clients) {
                clients.delete(ws);
                if (clients.size === 0) callEventClients.delete(userId);
            }
            console.log(`🔌 Call-events WS disconnected for user: ${userId}`);
        });
    });

    return callEventsWss;
};

/**
 * Send a call event to all WebSocket clients for a given userId.
 * @param {string} userId
 * @param {string} eventName  e.g. 'call:answered', 'call:ended'
 * @param {object} payload    e.g. { callSid: '...' }
 */
export const sendCallEvent = (userId, eventName, payload = {}) => {
    const clients = callEventClients.get(userId);
    if (!clients || clients.size === 0) {
        console.warn(`⚠️ No call-events WS clients for user: ${userId}`);
        return;
    }
    const message = JSON.stringify({ event: eventName, ...payload });
    for (const ws of clients) {
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(message);
        }
    }
    console.log(`📤 Sent ${eventName} to ${clients.size} client(s) for user: ${userId}`);
};
