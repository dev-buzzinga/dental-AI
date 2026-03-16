import { createClient } from "@deepgram/sdk";
import { config } from "../config/env.js";
import { updateLiveTranscript } from "./ai-scribe.service.js";

let deepgramClient = null;

// Initialize Deepgram client
export const initializeDeepgram = () => {
    if (!config.DEEPGRAM_API_KEY) {
        console.warn("⚠️ Deepgram API key not configured. Transcription will not be available.");
        return null;
    }

    if (!deepgramClient) {
        deepgramClient = createClient(config.DEEPGRAM_API_KEY);
        console.log("✅ Deepgram client initialized");
    }

    return deepgramClient;
};

// Setup WebSocket handler for a specific connection
export const setupTranscriptionConnection = async (clientWs, voiceNoteId) => {
    console.log(`📞 Setting up transcription for voice note: ${voiceNoteId}`);

    const deepgram = initializeDeepgram();
    
    if (!deepgram) {
        clientWs.send(JSON.stringify({
            type: 'error',
            message: 'Transcription service not available'
        }));
        clientWs.close();
        return;
    }

    let accumulatedTranscript = '';
    let deepgramConnection = null;

    try {
        // Create Deepgram live connection
        deepgramConnection = deepgram.listen.live({
            model: "nova-2",
            language: "en",
            smart_format: true,
            punctuate: true,
            encoding: "linear16",
            sample_rate: 16000,
            channels: 1,
        });

        // Handle Deepgram connection open
        deepgramConnection.on("open", () => {
            console.log("🔌 Connected to Deepgram");
            
            // Send confirmation to client
            clientWs.send(JSON.stringify({
                type: 'connected',
                message: 'Transcription service connected'
            }));
        });

        // Handle incoming transcripts from Deepgram
        deepgramConnection.on("transcript", (data) => {
            try {
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                
                if (transcript && transcript.trim()) {
                    const isFinal = data.is_final;
                    
                    console.log(`🎤 Transcript (${isFinal ? 'final' : 'interim'}):`, transcript);

                    // For final transcripts, accumulate them
                    if (isFinal) {
                        accumulatedTranscript += (accumulatedTranscript ? ' ' : '') + transcript;
                        
                        // Update database with accumulated transcript
                        updateLiveTranscript(voiceNoteId, accumulatedTranscript)
                            .catch(err => console.error("Error updating transcript:", err));
                    }

                    // Send transcript to client
                    if (clientWs.readyState === 1) { // WebSocket.OPEN
                        clientWs.send(JSON.stringify({
                            type: 'transcript',
                            text: transcript,
                            is_final: isFinal,
                            accumulated: accumulatedTranscript
                        }));
                    }
                }
            } catch (err) {
                console.error("Error processing transcript:", err);
            }
        });

        // Handle Deepgram errors
        deepgramConnection.on("error", (error) => {
            console.error("❌ Deepgram error:", error);
            
            if (clientWs.readyState === 1) {
                clientWs.send(JSON.stringify({
                    type: 'error',
                    message: 'Transcription error occurred'
                }));
            }
        });

        // Handle Deepgram connection close
        deepgramConnection.on("close", () => {
            console.log("🔌 Deepgram connection closed");
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
        console.error("Error setting up transcription:", error);
        
        if (clientWs.readyState === 1) {
            clientWs.send(JSON.stringify({
                type: 'error',
                message: 'Failed to setup transcription'
            }));
        }
        
        clientWs.close();
    }
};

export default {
    initializeDeepgram,
    setupTranscriptionConnection,
};
