import * as faqService from "../services/faq.service.js";

export const addFaq = async (req, res) => {
  try {
    const { user_id, question, answer, link } = req.body;
    const resolvedUserId = user_id || req.user?.id;

    if (!resolvedUserId || !question || !answer) {
      return res.status(400).json({
        success: false,
        message: "user_id, question and answer are required",
      });
    }

    const data = await faqService.addFaq({
      user_id: resolvedUserId,
      question,
      answer,
      link,
    });

    return res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data,
    });
  } catch (error) {
    console.error("addFaq error:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create FAQ",
      error: error.message,
    });
  }
};

export const searchFaqs = async (req, res) => {
  try {
    const { query, user_id, match_count } = req.body;
    const resolvedUserId = user_id || req.user?.id || null;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "query is required",
      });
    }

    const data = await faqService.searchFaqs({
      query,
      user_id: resolvedUserId,
      match_count,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("searchFaqs error:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to search FAQs",
      error: error.message,
    });
  }
};
