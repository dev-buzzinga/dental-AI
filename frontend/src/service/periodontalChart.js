import axios, { authAxiosInstance } from "../config/axiosConfig";

// Create new periodontal chart
const createPeriodontalChart = async (payload) => {
    return await authAxiosInstance.post('/periodontal-charts', payload);
};

// Get all periodontal charts for authenticated user with pagination and search
const getPeriodontalCharts = async (page = 0, limit = 10, search = '') => {
    const params = new URLSearchParams();
    if (typeof page === 'number') params.append('page', String(page));
    if (typeof limit === 'number') params.append('limit', String(limit));
    if (search) params.append('search', search);
    
    return await authAxiosInstance.get(`/periodontal-charts/user?${params.toString()}`);
};

// Get single periodontal chart by ID
const getPeriodontalChartById = async (id) => {
    return await authAxiosInstance.get(`/periodontal-charts/${id}`);
};

// Update periodontal chart
const updatePeriodontalChart = async (id, payload) => {
    return await authAxiosInstance.put(`/periodontal-charts/${id}`, payload);
};

// Delete periodontal chart
const deletePeriodontalChart = async (id) => {
    return await authAxiosInstance.delete(`/periodontal-charts/${id}`);
};

// Upload audio file
const uploadPeriodentalChartAudio = async (chartId, formData) => {
    return await authAxiosInstance.post(`/periodontal-charts/${chartId}/audio`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Generate AI summary from transcript
const generateAIChartSummary = async (chartId, payload) => {
    return await authAxiosInstance.post(`/periodontal-charts/${chartId}/summarize`, payload);
};

// Get AI summary status
const getPeriodontalChartSummaryStatus = async (chartId) => {
    return await authAxiosInstance.get(`/periodontal-charts/${chartId}/summary-status`);
};

export default {
    createPeriodontalChart,
    getPeriodontalCharts,
    getPeriodontalChartById,
    updatePeriodontalChart,
    deletePeriodontalChart,
    uploadPeriodentalChartAudio,
    generateAIChartSummary,
    getPeriodontalChartSummaryStatus,
};
