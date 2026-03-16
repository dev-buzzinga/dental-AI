import { createClient } from "@deepgram/sdk";
import { config } from "../config/env.js";
import { updateLiveTranscript } from "./ai-scribe.service.js";

let deepgramClient = null;

// Initialize Deepgram client
export const initializeDeepgram = () => {
    if (!config.DEEPGRAM_API_KEY) {
        console.error("❌ DEEPGRAM_API_KEY not configured in .env file!");
        console.error("❌ Please add: DEEPGRAM_API_KEY=your_key_here");
        return null;
    }

    if (!deepgramClient) {
        try {
            console.log("🔑 Initializing Deepgram with API key:", config.DEEPGRAM_API_KEY.substring(0, 8) + "...");
            deepgramClient = createClient(config.DEEPGRAM_API_KEY);
            console.log("✅ Deepgram client initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Deepgram client:", error.message);
            console.error("❌ Stack:", error.stack);
            return null;
        }
    }

    return deepgramClient;
};

// Setup WebSocket handler for a specific connection
export const setupTranscriptionConnection = async (clientWs, voiceNoteId) => {
    console.log(`📞 Setting up transcription for voice note: ${voiceNoteId}`);

    const deepgram = initializeDeepgram();
    
    if (!deepgram) {
        console.error("❌ Deepgram client not available for voiceNoteId:", voiceNoteId);
        clientWs.send(JSON.stringify({
            type: 'error',
            message: 'Transcription service not available - check server logs'
        }));
        clientWs.close(1011, 'Deepgram not initialized');
        return;
    }
    
    console.log("✅ Deepgram client ready, creating live connection...");

    let accumulatedTranscript = '';
    let deepgramConnection = null;

    try {
        // Create Deepgram live connection
        // Note: Deepgram can auto-detect encoding from WebM container
        console.log("📡 Creating Deepgram live connection with config:", {
            model: "nova-2",
            language: "en-US",
            smart_format: true,
            interim_results: true
        });
        
        deepgramConnection = deepgram.listen.live({
            model: "nova-2",
            language: "en-US",
            smart_format: true,
            punctuate: true,
            filler_words: false,
            interim_results: true, // Enable interim results for live feedback
            // Let Deepgram auto-detect encoding from WebM container
        });
        
        console.log("✅ Deepgram live connection object created (auto-detect encoding)");

        // Handle Deepgram connection open
        deepgramConnection.on("open", () => {
            console.log("✅ Connected to Deepgram successfully!");
            console.log("📊 Deepgram connection state:", deepgramConnection.getReadyState());
            console.log("🎧 Waiting for audio data...");
            
            // Send confirmation to client
            clientWs.send(JSON.stringify({
                type: 'connected',
                message: 'Transcription service connected'
            }));
        });
        
        // Handle Deepgram metadata
        deepgramConnection.on("metadata", (data) => {
            console.log("📊 Deepgram metadata:", JSON.stringify(data));
        });
        
        // Handle Deepgram warning
        deepgramConnection.on("warning", (warning) => {
            console.warn("⚠️ Deepgram warning:", warning);
        });

        // Handle incoming transcripts from Deepgram
        // Note: Deepgram SDK v3.x uses "Results" event, not "transcript"
        deepgramConnection.on("Results", (data) => {
            try {
                console.log("📨 Deepgram Results event received");
                
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                
                if (transcript && transcript.trim()) {
                    const isFinal = data.is_final;
                    
                    console.log(`🎤 Transcript (${isFinal ? 'FINAL' : 'interim'}):`, transcript);

                    // For final transcripts, accumulate them
                    if (isFinal) {
                        accumulatedTranscript += (accumulatedTranscript ? ' ' : '') + transcript;
                        
                        // Update database with accumulated transcript
                        updateLiveTranscript(voiceNoteId, accumulatedTranscript)
                            .catch(err => console.error("Error updating transcript:", err));
                    }

                    // Send transcript to client
                    if (clientWs.readyState === 1) { // WebSocket.OPEN
                        const payload = {
                            type: 'transcript',
                            text: transcript,
                            is_final: isFinal,
                            accumulated: accumulatedTranscript
                        };
                        console.log("📤 Sending to client:", payload);
                        clientWs.send(JSON.stringify(payload));
                    } else {
                        console.warn("⚠️ Client WebSocket not open, state:", clientWs.readyState);
                    }
                } else {
                    console.log("🔇 Empty or whitespace-only transcript, skipping");
                }
            } catch (err) {
                console.error("❌ Error processing transcript:", err);
                console.error("❌ Stack:", err.stack);
            }
        });

        // Handle Deepgram errors
        deepgramConnection.on("error", (error) => {
            console.error("❌ Deepgram error:", error);
            console.error("❌ Error details:", JSON.stringify(error, null, 2));
            
            if (clientWs.readyState === 1) {
                clientWs.send(JSON.stringify({
                    type: 'error',
                    message: `Transcription error: ${error.message || 'Unknown error'}`
                }));
            }
        });

        // Handle Deepgram connection close
        deepgramConnection.on("close", (code, reason) => {
            console.log("🔌 Deepgram connection closed");
            console.log("📊 Close code:", code);
            console.log("📊 Close reason:", reason);
        });

        // Handle client messages
        clientWs.on("message", async (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === 'audio' && data.data) {
                    // Decode base64 audio and send to Deepgram
                    const audioBuffer = Buffer.from(data.data, 'base64');
                    
                    if (deepgramConnection && deepgramConnection.getReadyState() === 1) {
                        deepgramConnection.send(audioBuffer);
                    } else {
                        const state = deepgramConnection?.getReadyState();
                        const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
                        console.error(`❌ Deepgram not ready! State: ${state} (${stateNames[state] || 'UNKNOWN'})`);
                    }
                } else if (data.type === 'stop') {
                    console.log("🛑 Stop signal received");
                    
                    // Finish sending data to Deepgram
                    if (deepgramConnection) {
                        deepgramConnection.finish();
                    }

                    // Send final transcript back to client
                    if (clientWs.readyState === 1) {
                        clientWs.send(JSON.stringify({
                            type: 'final',
                            transcript: accumulatedTranscript
                        }));
                    }
                }
            } catch (err) {
                console.error("Error processing client message:", err);
            }
        });

        // Handle client disconnect
        clientWs.on("close", () => {
            console.log("❌ Client disconnected");
            
            if (deepgramConnection) {
                deepgramConnection.finish();
            }
        });

        // Handle client errors
        clientWs.on("error", (error) => {
            console.error("Client WebSocket error:", error);
        });

    } catch (error) {
        console.error("❌ Error setting up transcription:", error);
        console.error("❌ Error details:", {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        if (clientWs.readyState === 1) {
            clientWs.send(JSON.stringify({
                type: 'error',
                message: `Failed to setup transcription: ${error.message}`
            }));
        }
        
        clientWs.close(1011, 'Setup failed');
    }
};

export default {
    initializeDeepgram,
    setupTranscriptionConnection,
};
