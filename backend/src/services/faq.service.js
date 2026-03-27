import axios from "axios";
import { supabase } from "../config/database.js";
import { config } from "../config/env.js";

const EMBEDDING_MODEL = config.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const stripHtml = (html = "") =>
  html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const fetchLinkContent = async (link) => {
  const response = await axios.get(link, {
    timeout: 15000,
    responseType: "text",
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  const rawContent = typeof response?.data === "string" ? response.data : "";
  const textContent = stripHtml(rawContent);

  if (!textContent) {
    throw new Error("Unable to extract content from link");
  }

  return textContent.slice(0, 15000);
};

const generateEmbedding = async (inputText) => {
  if (!config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      model: EMBEDDING_MODEL,
      input: inputText,
    },
    {
      headers: {
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const embedding = response?.data?.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Failed to generate embedding");
  }

  return embedding;
};

const buildFaqPayload = async ({ question, answer, link }) => {
  const trimmedQuestion = question?.trim() || "";
  const trimmedAnswer = answer?.trim() || "";
  const trimmedLink = link?.trim() || "";

  const hasLink = Boolean(trimmedLink);
  const hasQuestionAnswer = Boolean(trimmedQuestion && trimmedAnswer);

  if ((hasLink && hasQuestionAnswer) || (!hasLink && !hasQuestionAnswer)) {
    throw new Error("Provide either link OR both question and answer");
  }

  let dbQuestion = trimmedQuestion;
  let dbAnswer = trimmedAnswer;
  let dbLink = null;
  let embeddingInput = `${trimmedQuestion}\n\n${trimmedAnswer}`;

  if (trimmedLink) {
    const linkContent = await fetchLinkContent(trimmedLink);
    dbQuestion = "";
    dbAnswer = "";
    dbLink = trimmedLink;
    embeddingInput = linkContent;
  }

  const embedding = await generateEmbedding(embeddingInput);
  return { dbQuestion, dbAnswer, dbLink, embedding };
};

export const addFaq = async ({ user_id, question, answer, link }) => {
  const { dbQuestion, dbAnswer, dbLink, embedding } = await buildFaqPayload({
    question,
    answer,
    link,
  });

  const { data, error } = await supabase
    .from("faqs")
    .insert({
      user_id,
      question: dbQuestion,
      answer: dbAnswer,
      link: dbLink,
      embedding,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// update API
export const updateFaq = async ({ faq_id, user_id, question, answer, link }) => {
  if (!faq_id) {
    throw new Error("faq_id is required");
  }

  const { dbQuestion, dbAnswer, dbLink, embedding } = await buildFaqPayload({
    question,
    answer,
    link,
  });

  const { error: clearError } = await supabase
    .from("faqs")
    .update({
      question: "",
      answer: "",
      link: null,
      embedding: null,
    })
    .eq("id", faq_id)
    .eq("user_id", user_id);

  if (clearError) {
    throw clearError;
  }

  const { data, error } = await supabase
    .from("faqs")
    .update({
      question: dbQuestion,
      answer: dbAnswer,
      link: dbLink,
      embedding,
    })
    .eq("id", faq_id)
    .eq("user_id", user_id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// export const searchFaqs = async ({ query, user_id, match_count = 5 }) => {
//   const queryEmbedding = await generateEmbedding(query);

//   const rpcPayload = {
//     query_embedding: queryEmbedding,
//     match_count,
//   };

//   if (user_id) {
//     rpcPayload.filter_user_id = user_id;
//   }

//   const { data, error } = await supabase.rpc("match_faqs", rpcPayload);

//   if (error) {
//     throw error;
//   }

//   return data || [];
// };
