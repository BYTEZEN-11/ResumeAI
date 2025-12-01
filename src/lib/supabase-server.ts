import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (process.env.NODE_ENV === "production" && (!supabaseUrl || !supabaseServiceKey)) {
  throw new Error(
    "Supabase service-role client is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in production."
  );
}
export const supabaseAdmin = createClient(
  supabaseUrl ?? "http://placeholder.supabase.co",
  supabaseServiceKey ?? "invalid-service-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
