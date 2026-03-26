import axios from "axios";
import { supabase } from "../config/database.js";
import { config } from "../config/env.js";

const EMBEDDING_MODEL = config.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

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

export const addFaq = async ({ user_id, question, answer, link }) => {
  const combinedText = `${question}\n\n${answer}`;
  const embedding = await generateEmbedding(combinedText);

  const { data, error } = await supabase
    .from("faqs")
    .insert({
      user_id,
      question,
      answer,
      link: link || null,
      embedding,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const searchFaqs = async ({ query, user_id, match_count = 5 }) => {
  const queryEmbedding = await generateEmbedding(query);

  const rpcPayload = {
    query_embedding: queryEmbedding,
    match_count,
  };

  if (user_id) {
    rpcPayload.filter_user_id = user_id;
  }

  const { data, error } = await supabase.rpc("match_faqs", rpcPayload);

  if (error) {
    throw error;
  }

  return data || [];
};
