import http from "http";
import { WebSocketServer } from "ws";
import app from "./app.js";
import { config } from "./config/env.js";
import { startCronJobs } from "./cron/index.js";
import { setupTranscriptionConnection } from "./services/transcription.service.js";

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ 
    server,
    path: '/ws/transcribe'
});

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    console.log('📞 New WebSocket connection');
    
    // Extract voiceNoteId from query params
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

    // Setup transcription for this connection
    setupTranscriptionConnection(ws, voiceNoteId);
});

// Start server
server.listen(config.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${config.PORT}`);
    console.log(`🔌 WebSocket server ready at ws://localhost:${config.PORT}/ws/transcribe`);
    startCronJobs();
});
