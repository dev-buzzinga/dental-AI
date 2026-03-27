import * as faqService from "../services/faq.service.js";

export const addFaq = async (req, res) => {
  try {
    const { question, answer, link } = req.body;
    const user_id = req.user?.id;

    const hasLink = Boolean(link?.trim());
    const hasQuestionAnswer = Boolean(question?.trim() && answer?.trim());

    if (!user_id || (!hasLink && !hasQuestionAnswer)) {
      return res.status(400).json({
        success: false,
        message: "either link or both question and answer are required",
      });
    }

    const data = await faqService.addFaq({
      user_id,
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

export const updateFaq = async (req, res) => {
  try {
    const { faq_id, question, answer, link } = req.body;
    const user_id = req.user?.id;

    const hasLink = Boolean(link?.trim());
    const hasQuestionAnswer = Boolean(question?.trim() && answer?.trim());

    if (!user_id || !faq_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and faq_id are required",
      });
    }

    if ((hasLink && hasQuestionAnswer) || (!hasLink && !hasQuestionAnswer)) {
      return res.status(400).json({
        success: false,
        message: "Provide either link OR both question and answer",
      });
    }

    const data = await faqService.updateFaq({
      faq_id,
      user_id,
      question,
      answer,
      link,
    });

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data,
    });
  } catch (error) {
    console.error("updateFaq error:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update FAQ",
      error: error.message,
    });
  }
};

export const getAllFaqs = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "user_id is required",
      });
    }

    const data = await faqService.getAllFaqs({ user_id });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("getAllFaqs error:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get FAQs",
      error: error.message,
    });
  }
};

export const getOneFaq = async (req, res) => {
  try {
    const faq_id = req.params?.faq_id;
    const user_id = req.user?.id;

    if (!faq_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "faq_id and user_id are required",
      });
    }

    const data = await faqService.getOneFaq({ faq_id, user_id });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("getOneFaq error:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to get FAQ",
      error: error.message,
    });
  }
};

export const deleteFaq = async (req, res) => {
  try {
    const faq_id = req.params?.faq_id;
    const user_id = req.user?.id;

    if (!faq_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "faq_id and user_id are required",
      });
    }

    const data = await faqService.deleteFaq({ faq_id, user_id });

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
      data,
    });
  } catch (error) {
    console.error("deleteFaq error:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete FAQ",
      error: error.message,
    });
  }
};
