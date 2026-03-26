import { authAxiosInstance } from "../config/axiosConfig";

const addFaq = async (faq) => {
    const response = await authAxiosInstance.post("/faqs/add", faq);
    return response.data;
};

const searchFaqs = async ({ query, user_id, match_count = 5 }) => {
    const response = await authAxiosInstance.post("/faqs/search", {
        query,
        user_id,
        match_count,
    });
    return response.data;
};

export default {
    addFaq,
    searchFaqs,
};
