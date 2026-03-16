import axios, { authAxiosInstance } from "../config/axiosConfig";

// Create new AI scribe record
const createAiScribe = async (payload) => {
    return await authAxiosInstance.post("/ai-scribe", payload);
};

// Get AI scribe by ID
const getAiScribeById = async (id) => {
    return await authAxiosInstance.get(`/ai-scribe/${id}`);
};

// Get all AI scribes for a user
const getAiScribesByUser = async (userId) => {
    return await authAxiosInstance.get(`/ai-scribe/user/${userId}`);
};

// Update AI scribe
const updateAiScribe = async (id, payload) => {
    return await authAxiosInstance.put(`/ai-scribe/${id}`, payload);
};

// Delete AI scribe
const deleteAiScribe = async (id) => {
    return await authAxiosInstance.delete(`/ai-scribe/${id}`);
};

// Upload audio file
const uploadAiScribeAudio = async (id, formData) => {
    return await authAxiosInstance.post(`/ai-scribe/${id}/audio`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Generate AI summary
const generateAiScribeSummary = async (id, payload) => {
    return await authAxiosInstance.post(`/ai-scribe/${id}/summarize`, payload);
};

export default {
    createAiScribe,
    getAiScribeById,
    getAiScribesByUser,
    updateAiScribe,
    deleteAiScribe,
    uploadAiScribeAudio,
    generateAiScribeSummary,
};
