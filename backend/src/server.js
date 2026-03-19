import http from "http";
import { WebSocketServer } from "ws";
import app from "./app.js";
import { config } from "./config/env.js";
import { startCronJobs } from "./cron/index.js";
import { setupTranscriptionConnection } from "./services/transcription.service.js";
import { initCallEventsWs } from "./services/callEventWs.js";

// Create HTTP server
const server = http.createServer(app);

// ─── WebSocket 1: Transcription (noServer mode) ────────────
const transcribeWss = new WebSocketServer({ noServer: true });

transcribeWss.on('connection', (ws, req) => {
    console.log('📞 New WebSocket connection');
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const voiceNoteId = url.searchParams.get('voiceNoteId');

    if (!voiceNoteId) {
        console.error('❌ Missing voiceNoteId');
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Missing voiceNoteId parameter'
        }));
        ws.close(1008, 'Missing voiceNoteId');
        return;
    }

    setupTranscriptionConnection(ws, voiceNoteId);
});

// ─── WebSocket 2: Call Events (noServer mode) ──────────────
const callEventsWss = initCallEventsWs();

// ─── Manual upgrade routing by path ────────────────────────
server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (pathname === '/ws/transcribe') {
        transcribeWss.handleUpgrade(request, socket, head, (ws) => {
            transcribeWss.emit('connection', ws, request);
        });
    } else if (pathname === '/ws/call-events') {
        callEventsWss.handleUpgrade(request, socket, head, (ws) => {
            callEventsWss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

// Start server
server.listen(config.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${config.PORT}`);
    console.log(`🔌 WebSocket server ready at ws://localhost:${config.PORT}/ws/transcribe`);
    console.log(`📡 Call-events WS ready at ws://localhost:${config.PORT}/ws/call-events`);
    startCronJobs();
});
