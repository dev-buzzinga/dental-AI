import { authAxiosInstance } from "../config/axiosConfig";

const addFaq = async (faq) => {
    const response = await authAxiosInstance.post("/faqs/add", faq);
    return response.data;
};

const getAllFaqs = async () => {
    const response = await authAxiosInstance.get("/faqs/all");
    return response.data;
};

const getOneFaq = async (faqId) => {
    const response = await authAxiosInstance.get(`/faqs/${faqId}`);
    return response.data;
};

const updateFaq = async (payload) => {
    const response = await authAxiosInstance.put("/faqs/update", payload);
    return response.data;
};

const deleteFaq = async (faqId) => {
    const response = await authAxiosInstance.delete(`/faqs/${faqId}`);
    return response.data;
};

export default {
    addFaq,
    getAllFaqs,
    getOneFaq,
    updateFaq,
    deleteFaq,
};
