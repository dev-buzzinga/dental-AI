import { supabase } from "../config/database.js";
import { generateAISummary } from "./anthropic.service.js";

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
      doctors${search ? '!inner' : ''} (id, name, profile_img)
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
export async function getPeriodontalChartById(id, user_id) {
  try {
    const { data, error } = await supabase
      .from('periodontal_charts')
      .select(`
        *,
        patients (id, name, phone, email),
        doctors (id, name, profile_img)
      `)
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

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
    const chart = await getPeriodontalChartById(chartId, user_id);
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
    const chart = await getPeriodontalChartById(chartId, user_id);
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

    // Update with transcript URL and set generating flag
    await supabase
      .from('periodontal_charts')
      .update({
        transcript_url: publicUrl,
        updated_at: new Date().toISOString(),
        isSummaryGenerating: true
      })
      .eq('id', chartId)
      .eq('user_id', user_id)
      .select()
      .single();

    // Generate AI summary asynchronously (don't wait)
    generateAIChartSummary({ transcript, patient_name: chart.patients?.name || "" })
      .then((result) => {
        return supabase
          .from('periodontal_charts')
          .update({
            aiSummary: result,
            updated_at: new Date().toISOString(),
            isSummaryGenerating: false
          })
          .eq('id', chartId)
          .eq('user_id', user_id)
          .select()
          .single();
      })
      .catch((err) => {
        console.error("Error in generating chart summary", err);
        return supabase
          .from('periodontal_charts')
          .update({
            updated_at: new Date().toISOString(),
            isSummaryGenerating: false
          })
          .eq('id', chartId)
          .eq('user_id', user_id)
          .select()
          .single();
      });

    return { url: publicUrl };
  } catch (error) {
    console.error("Error uploading transcript:", error);
    throw error;
  }
}

// Generate AI summary using Claude/Anthropic
export async function generateAIChartSummary(payload) {
  try {
    const prompt = `You are a dental assistant. Extract periodontal chart data from the following voice transcript.

Patient: ${payload.patient_name || "Unknown"}
Transcript: ${payload.transcript}

Please extract and return a JSON array containing tooth data. Each tooth should have:
- Tooth number (1-32)
- Mobility (0-3)
- Furcation ('None', '1', '2', '3')
- Plaque (array of 6 boolean values for sites MB, B, DB, ML, L, DL)
- BOP - Bleeding on Probing (array of 6 boolean values)
- GR - Gingival Recession (array of 6 numeric values)
- PD - Pocket Depth (array of 6 numeric values)

Only include teeth that are mentioned in the transcript. Return valid JSON only.`;

    const response = await generateAISummary({
      prompt,
      template_id: null,
      patient_name: payload.patient_name
    });

    if (!response || !response.summary) {
      console.error("AI service returned no summary");
      return [];
    }

    // Try to parse the summary as JSON
    try {
      const summary = typeof response.summary === 'string' 
        ? JSON.parse(response.summary) 
        : response.summary;
      
      return Array.isArray(summary) ? summary : [];
    } catch (parseError) {
      console.error("Error parsing AI summary:", parseError);
      return [];
    }
  } catch (error) {
    console.error('AI summary generation error:', error);
    return [];
  }
}
