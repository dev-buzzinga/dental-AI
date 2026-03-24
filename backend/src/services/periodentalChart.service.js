import { supabase } from "../config/database.js";
import { generatePeriodentalChartSummary } from "./anthropic.service.js";

function isMissingColumnError(error) {
  const message = error?.message || "";
  return (
    message.includes("Could not find the '") &&
    message.includes("' column of 'periodontal_charts'")
  );
}

async function updateSummaryState(chartId, user_id, updates) {
  const variants = [
    {
      ...(updates.isSummaryGenerating !== undefined
        ? { isSummaryGenerating: updates.isSummaryGenerating }
        : {}),
      ...(updates.aiSummary !== undefined ? { aiSummary: updates.aiSummary } : {}),
      updated_at: new Date().toISOString(),
    },
    {
      ...(updates.isSummaryGenerating !== undefined
        ? { issummarygenerating: updates.isSummaryGenerating }
        : {}),
      ...(updates.aiSummary !== undefined ? { aisummary: updates.aiSummary } : {}),
      updated_at: new Date().toISOString(),
    },
    {
      ...(updates.isSummaryGenerating !== undefined
        ? { is_summary_generating: updates.isSummaryGenerating }
        : {}),
      ...(updates.aiSummary !== undefined ? { ai_summary: updates.aiSummary } : {}),
      updated_at: new Date().toISOString(),
    },
  ];

  let lastNonMissingColumnError = null;

  for (const payload of variants) {
    const { error } = await supabase
      .from('periodontal_charts')
      .update(payload)
      .eq('id', chartId)
      .eq('user_id', user_id);

    if (!error) return;

    if (!isMissingColumnError(error)) {
      lastNonMissingColumnError = error;
      break;
    }
  }

  if (lastNonMissingColumnError) {
    throw lastNonMissingColumnError;
  }
}

// Create periodontal chart
export async function createPeriodontalChart({
  patient_id,
  user_id,
  doctor_id,
  dob,
  chart_date,
  recording_url,
  transcript_url,
  tooth_data,
}) {
  try {
    const { data, error } = await supabase
      .from('periodontal_charts')
      .insert([{
        patient_id,
        user_id,
        doctor_id,
        dob,
        chart_date,
        recording_url: recording_url || null,
        transcript_url: transcript_url || null,
        tooth_data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating periodontal chart:", error);
    throw error;
  }
}

// Get all charts for a user with joins, pagination, and search
export async function findChartsByUserId(user_id, limit, offset, search = '') {
  try {
    const selectBase = `
      *,
      patients (id, name, phone, email),
      doctors${search ? '!inner' : ''} (id, name)
    `;

    let query = supabase
      .from('periodontal_charts')
      .select(selectBase)
      .eq('user_id', user_id);

    // Apply search filter on doctor name if provided
    if (search && search.trim().length > 0) {
      query = query.ilike('doctors.name', `%${search.trim()}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error finding charts by user ID:", error);
    throw error;
  }
}

// Count total charts for a user (with optional search)
export async function countChartsByUserId(user_id, search = '') {
  try {
    let query = supabase
      .from('periodontal_charts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id);

    // Apply search filter on doctor name if provided
    if (search && search.trim().length > 0) {
      query = query
        .select('*, doctors!inner(name)', { count: 'exact', head: true })
        .ilike('doctors.name', `%${search.trim()}%`);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error counting charts:", error);
    throw error;
  }
}

// Get single chart by ID (with user verification)
export async function getOnePeriodontalChart(id, user_id) {
  try {
    const { data, error } = await supabase
      .from('periodontal_charts')
      .select(`
        *,
        patients (id, name, phone, email),
        doctors (id, name)
      `)
      .eq('id', id)
      .eq('user_id', user_id)
      .single();
    // console.log("getOnePeriodontalChart check data==>", data);
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error getting periodontal chart by ID:", error);
    throw error;
  }
}

// Update periodontal chart
export async function updatePeriodontalChart(id, user_id, data) {
  try {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('periodontal_charts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    console.error("Error updating periodontal chart:", error);
    throw error;
  }
}

// Delete periodontal chart
export async function deletePeriodontalChart(id, user_id) {
  try {
    const { error } = await supabase
      .from('periodontal_charts')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting periodontal chart:", error);
    throw error;
  }
}

// Upload audio to Supabase storage
export async function uploadPeriodentalChartAudio(
  chartId,
  user_id,
  buffer,
  originalName,
  mimetype = 'audio/webm',
  duration = 0
) {
  try {
    // Verify chart belongs to user
    const chart = await getOnePeriodontalChart(chartId, user_id);
    if (!chart) {
      throw new Error("Periodontal chart not found or access denied");
    }

    const filename = `periodontal_${chartId}_${Date.now()}_${originalName}`;

    // Upload to storage bucket
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(filename, buffer, {
        contentType: mimetype,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('audio')
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;

    // Update database with audio URL and duration
    const { data: updated, error: updateError } = await supabase
      .from('periodontal_charts')
      .update({
        recording_url: publicUrl,
        duration_seconds: duration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chartId)
      .eq('user_id', user_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return { url: publicUrl, chart: updated };
  } catch (error) {
    console.error("Error uploading audio:", error);
    throw error;
  }
}

// Upload transcript and generate AI summary (async)
export async function uploadPeriodentalChartSummary(chartId, user_id, transcript, filename) {
  try {
    // Verify chart belongs to user
    const chart = await getOnePeriodontalChart(chartId, user_id);
    if (!chart) {
      throw new Error("Periodontal chart not found or access denied");
    }

    // Upload transcript to storage
    const { data, error } = await supabase.storage
      .from('transcripts')
      .upload(filename, transcript, {
        contentType: 'text/plain',
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('transcripts')
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;

    // Always persist transcript URL first.
    const { error: transcriptUpdateError } = await supabase
      .from('periodontal_charts')
      .update({
        transcript_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chartId)
      .eq('user_id', user_id)
      .select('id')
      .single();

    if (transcriptUpdateError) throw transcriptUpdateError;

    // Set async generation state with column-name fallback support.
    await updateSummaryState(chartId, user_id, { isSummaryGenerating: true });

    // Generate AI summary asynchronously (don't wait)
    generatePeriodentalChartSummary(transcript)
      .then((result) => {
        // console.log("check result==>", result);
        return updateSummaryState(chartId, user_id, {
          aiSummary: result,
          isSummaryGenerating: false,
        });
      })
      .catch((err) => {
        console.error("Error in generating chart summary", err);
        return updateSummaryState(chartId, user_id, { isSummaryGenerating: false }).catch(
          (updateErr) => {
            console.error("Error resetting summary generation flag", updateErr);
          }
        );
      });

    return { url: publicUrl };
  } catch (error) {
    console.error("Error uploading transcript:", error);
    throw error;
  }
}

