import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {

  console.warn(
    "Supabase browser client is missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(
  supabaseUrl ?? "http://placeholder.supabase.co",
  supabaseAnonKey ?? "invalid-anon-key"
);
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "resumes";

export { supabaseAdmin } from "./supabase-server";
