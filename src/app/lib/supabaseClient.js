import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== "undefined") {
  console.log("Supabase env present?", {
    urlPresent: !!url,
    keyPresent: !!key,
  });
}

export const supabase = createClient(url, key);
