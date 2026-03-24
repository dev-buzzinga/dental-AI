import * as periodentalChartService from "../services/periodentalChart.service.js";

// Create new periodontal chart
export async function createPeriodontalChart(req, res, next) {
  try {
    const data = req.body;
    const { id: user_id } = req.user;
    
    // Set user_id from authenticated user
    data.user_id = user_id;
    
    const chart = await periodentalChartService.createPeriodontalChart(data);
    
    return res.status(201).json({
      success: true,
      data: chart,
      message: "Periodontal chart created successfully"
    });
  } catch (error) {
    console.error("Create periodontal chart error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create periodontal chart"
    });
  }
}

// Get all charts for the authenticated user with pagination and search
export async function getAllPeriodontalCharts(req, res, next) {
  try {
    const { id: user_id } = req.user;
    const page = parseInt(req.query.page, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = (req.query.search || '').toString();
    const offset = page * limit;

    const [data, total] = await Promise.all([
      periodentalChartService.findChartsByUserId(user_id, limit, offset, search),
      periodentalChartService.countChartsByUserId(user_id, search),
    ]);

    return res.status(200).json({
      success: true,
      data,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error("Get all periodontal charts error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch periodontal charts"
    });
  }
}

// Get single chart by ID
export async function getOnePeriodontalChart(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { id: user_id } = req.user;
    
    const chart = await periodentalChartService.getOnePeriodontalChart(id, user_id);
    
    if (!chart) {
      return res.status(404).json({
        success: false,
        message: "Periodontal chart not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: chart
    });
  } catch (error) {
    console.error("Get periodontal chart by ID error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch periodontal chart"
    });
  }
}

// Update chart
export async function updatePeriodontalChart(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { id: user_id } = req.user;
    const data = req.body;
    
    const updatedChart = await periodentalChartService.updatePeriodontalChart(id, user_id, data);
    
    return res.status(200).json({
      success: true,
      data: updatedChart,
      message: "Periodontal chart updated successfully"
    });
  } catch (error) {
    console.error("Update periodontal chart error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update periodontal chart"
    });
  }
}

// Delete chart
export async function deletePeriodontalChart(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { id: user_id } = req.user;
    
    await periodentalChartService.deletePeriodontalChart(id, user_id);
    
    return res.status(200).json({
      success: true,
      message: "Periodontal chart deleted successfully"
    });
  } catch (error) {
    console.error("Delete periodontal chart error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete periodontal chart"
    });
  }
}

// Upload audio file
export async function uploadPeriodentalChartAudio(req, res) {
  try {
    const chartId = parseInt(req.params.id);
    const { id: user_id } = req.user;
    
    if (!req.files || !req.files.audio) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required"
      });
    }
    
    const audioFile = req.files.audio;
    const duration = parseInt(req.body.duration || 0);
    
    const result = await periodentalChartService.uploadPeriodentalChartAudio(
      chartId,
      user_id,
      audioFile.data,
      audioFile.name,
      audioFile.mimetype,
      duration
    );
    
    return res.status(200).json({
      success: true,
      data: result,
      message: "Audio uploaded successfully"
    });
  } catch (error) {
    console.error("Upload audio error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload audio"
    });
  }
}

// Upload transcript and trigger AI processing
export async function uploadPeriodentalChartSummary(req, res) {
  try {
    const chartId = parseInt(req.params.id);
    const { id: user_id } = req.user;
    const transcript = req.body.transcript;
    
    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: "Transcript is required"
      });
    }
    
    const filename = `transcript_chart_${chartId}_${Date.now()}.txt`;
    
    const result = await periodentalChartService.uploadPeriodentalChartSummary(
      chartId,
      user_id,
      transcript,
      filename
    );
    
    return res.status(200).json({
      success: true,
      data: result,
      message: "Transcript uploaded and AI summary generation started"
    });
  } catch (error) {
    console.error("Upload transcript error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload transcript"
    });
  }
}

// Check AI processing status
export async function getSummaryStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { id: user_id } = req.user;
    
    const chart = await periodentalChartService.getOnePeriodontalChart(id, user_id);
    
    if (!chart) {
      return res.status(404).json({
        success: false,
        message: "Periodontal chart not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        isSummaryGenerating: Boolean(
          chart.isSummaryGenerating ??
            chart.issummarygenerating ??
            chart.is_summary_generating
        ),
        summary: chart.aiSummary ?? chart.aisummary ?? chart.ai_summary ?? null
      }
    });
  } catch (error) {
    console.error("Get summary status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get summary status"
    });
  }
}
