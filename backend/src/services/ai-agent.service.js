import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

// ─── ElevenLabs helpers ───────────────────────────────────────────────────────

/**
 * Fetch all available voices from ElevenLabs and normalize shape.
 */
export const getAvailableVoices = async () => {
    const response = await axios.get(
        'https://api.elevenlabs.io/v1/voices',
        {
            headers: {
                'xi-api-key': config.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            }
        }
    );

    const voices = response.data?.voices || [];
    return voices.map((v) => ({
        voiceId: v.voice_id,
        name: v.name,
        category: v.category,
        description: v.labels?.description || null,
        previewUrl: v.preview_url,
        avatarUrl: null,
    }));
};


// ─── DB helpers ───────────────────────────────────────────────────────────────

/**
 * Get saved AI agent config for this user (returns null if none yet).
 */
export const getAIAgent = async (userId) => {
    const { data, error } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;
    return data; // null if not configured yet
};

/**
 * Upsert voice + prompt for this user, then async-generate the TTS audio.
 */
export const saveAIAgent = async (userId, voiceId, introductionPrompt) => {
    const { data, error } = await supabase
        .from("ai_agents")
        .upsert(
            {
                user_id: userId,
                voice_id: voiceId,
                introduction_prompt: introductionPrompt,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
        )
        .select()
        .single();

    if (error) throw error;

    // Fire-and-forget: generate TTS audio and store URL
    initPromptVoice(userId).catch((err) =>
        console.error("initPromptVoice error:", err)
    );

    return data;
};

/**
 * Call ElevenLabs TTS and return an audio Buffer.
 */
export const textToVoice = async (voiceId, text) => {
    const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        { text },
        {
            headers: {
                "xi-api-key": config.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
            },
            responseType: "arraybuffer",
        }
    );
    return Buffer.from(response.data);
};
/**
 * Generate TTS for the saved prompt and upload MP3 to Supabase storage.
 * Updates prompt_voice_url in DB when done.
 */
export const initPromptVoice = async (userId) => {
    const agent = await getAIAgent(userId);
    if (!agent?.voice_id || !agent?.introduction_prompt) return;

    const buffer = await textToVoice(agent.voice_id, agent.introduction_prompt);
    const filename = `ai_agent_prompt_${userId}_${Date.now()}.mp3`;

    const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(filename, buffer, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
        .from("audio")
        .getPublicUrl(filename);

    await supabase
        .from("ai_agents")
        .update({ prompt_voice_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
};

/**
 * Generate a one-off TTS preview — does NOT save anything.
 * Returns an audio Buffer.
 */
export const generatePreviewAudio = async (voiceId, text) => {
    return await textToVoice(voiceId, text);
};
