import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";
import { generateAISummary } from "./anthropic.service.js";

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

// Store temporary transcripts in memory (for sessions before DB entry is created)
const temporaryTranscripts = new Map();

export const createAiScribe = async (data) => {
    try {
        const { data: result, error } = await supabase
            .from("ai_scribes")
            .insert({
                user_id: data.user_id,
                patient_id: data.patient_id,
                doctor_id: data.doctor_id,
                template_id: data.template_id || null,
                description: data.description || null,
                date_created: data.date_created || new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        return result;
    } catch (error) {
        console.error("Error creating AI scribe:", error);
        throw error;
    }
};

export const getAiScribeById = async (id) => {
    try {
        const { data, error } = await supabase
            .from("ai_scribes")
            .select(`
                *,
                patients (id, name, phone, email),
                doctors (id, name),
                voice_notes_template (id, name, details)
            `)
            .eq("id", id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching AI scribe:", error);
        throw error;
    }
};

export const getAiScribesByUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from("ai_scribes")
            .select(`
                *,
                patients (id, name, phone, email),
                doctors (id, name),
                voice_notes_template (id, name, details)
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching AI scribes:", error);
        throw error;
    }
};

export const updateAiScribe = async (id, updates) => {
    try {
        const { data, error } = await supabase
            .from("ai_scribes")
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error updating AI scribe:", error);
        throw error;
    }
};

export const deleteAiScribe = async (id) => {
    try {
        // Get scribe data first to delete associated files
        const scribe = await getAiScribeById(id);

        // Delete audio file if exists
        if (scribe.user_recording_url) {
            const audioPath = scribe.user_recording_url.split('/').pop();
            await supabase.storage.from("audio").remove([audioPath]);
        }

        // Delete transcript file if exists
        if (scribe.transcript_url) {
            const transcriptPath = scribe.transcript_url.split('/').pop();
            await supabase.storage.from("transcripts").remove([transcriptPath]);
        }

        // Delete summary file if exists
        if (scribe.ai_summary_url) {
            const summaryPath = scribe.ai_summary_url.split('/').pop();
            await supabase.storage.from("transcripts").remove([summaryPath]);
        }

        // Delete the scribe record
        const { error } = await supabase
            .from("ai_scribes")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Error deleting AI scribe:", error);
        throw error;
    }
};

export const uploadAudio = async (id, audioFile, duration) => {
    try {
        const filename = `scribe_${id}_${Date.now()}.webm`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from("audio")
            .upload(filename, audioFile.data, {
                contentType: audioFile.mimetype || "audio/webm",
                upsert: false,
            });

        if (error) throw error;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from("audio")
            .getPublicUrl(filename);

        const publicUrl = publicUrlData.publicUrl;

        // Update scribe with audio URL
        await updateAiScribe(id, {
            user_recording_url: publicUrl,
            duration_seconds: duration,
        });

        return { url: publicUrl };
    } catch (error) {
        console.error("Error uploading audio:", error);
        throw error;
    }
};

export const generateSummary = async (id, payload) => {
    try {
        const { transcript, patient_name, doctor_name, template } = payload;

        // 1. Store transcript in Supabase Storage
        const transcriptFilename = `transcript_${id}_${Date.now()}.txt`;
        const { data: transcriptData, error: transcriptError } = await supabase.storage
            .from("transcripts")
            .upload(transcriptFilename, transcript, {
                contentType: "text/plain",
                upsert: false,
            });

        if (transcriptError) throw transcriptError;

        const { data: transcriptUrlData } = supabase.storage
            .from("transcripts")
            .getPublicUrl(transcriptFilename);

        const transcriptUrl = transcriptUrlData.publicUrl;

        // 2. Update scribe with transcript
        await updateAiScribe(id, {
            live_transcript: transcript,
            transcript_url: transcriptUrl,
        });

        // 3. Generate AI summary using Anthropic
        const aiSummary = await generateAISummary({
            transcript,
            patient_name,
            doctor_name,
            template,
        });

        // 4. Store summary in Supabase Storage
        const summaryFilename = `summary_${id}_${Date.now()}.txt`;
        const { data: summaryData, error: summaryError } = await supabase.storage
            .from("transcripts")
            .upload(summaryFilename, aiSummary, {
                contentType: "text/plain",
                upsert: false,
            });

        if (summaryError) throw summaryError;

        const { data: summaryUrlData } = supabase.storage
            .from("transcripts")
            .getPublicUrl(summaryFilename);

        const summaryUrl = summaryUrlData.publicUrl;

        // 5. Update scribe with summary
        const updatedScribe = await updateAiScribe(id, {
            ai_summary: aiSummary,
            ai_summary_url: summaryUrl,
        });

        return {
            transcript_url: transcriptUrl,
            ai_summary: aiSummary,
            ai_summary_url: summaryUrl,
            scribe: updatedScribe,
        };
    } catch (error) {
        console.error("Error generating summary:", error);
        throw error;
    }
};

export const updateLiveTranscript = async (id, transcript) => {
    try {
        // Check if this is a temporary session ID (UUID format but not in DB yet)
        // Try to update DB first, if it fails, store in memory
        const { error } = await supabase
            .from("ai_scribes")
            .update({
                live_transcript: transcript,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        
        if (error) {
            // If update fails (record doesn't exist), store in memory
            console.log(`💾 Storing transcript in memory for session: ${id}`);
            temporaryTranscripts.set(id, transcript);
        }
        
        return { success: true };
    } catch (error) {
        // On any error, store in memory as fallback
        console.log(`💾 Fallback: Storing transcript in memory for session: ${id}`);
        temporaryTranscripts.set(id, transcript);
        return { success: true };
    }
};

// Get transcript from memory (for temporary sessions)
export const getTemporaryTranscript = (sessionId) => {
    const transcript = temporaryTranscripts.get(sessionId);
    return transcript || '';
};

// Clear transcript from memory after it's saved to DB
export const clearTemporaryTranscript = (sessionId) => {
    temporaryTranscripts.delete(sessionId);
};

// Generate AI summary preview (without saving to DB)
export const generateSummaryPreview = async ({ transcript, patient_name, doctor_name, template }) => {
    try {
        const summary = await generateAISummary({
            transcript,
            patient_name,
            doctor_name,
            template,
        });
        return summary;
    } catch (error) {
        console.error("Error generating summary preview:", error);
        throw error;
    }
};
