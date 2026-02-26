import { createClient } from "@supabase/supabase-js";
import { config } from "./env.js";

const supabaseUrl = config.SUPABASE_URL;
const supabaseRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseRoleKey) {
  console.error("Missing Supabase URL or Key in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseRoleKey);
console.log("Supabase client initialized successfully.");

// const testConnection = async () => {
//   try {

//     const { data, error } = await supabase
//       .from("doctors")
//       .select("*")
//       .eq("id", 9);

//     console.log(data);
//     if (error) {
//       console.error("❌ Supabase connection failed:", error.message);
//     } else {
//       console.log("✅ Supabase connected successfully!", data);
//     }
//   } catch (err) {
//     console.error("❌ Unexpected error while connecting:", err.message);
//   }
// };

// testConnection();