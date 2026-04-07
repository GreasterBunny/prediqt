import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

function isValidUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Returns a Supabase browser client, or null if env vars are not configured.
 * Safe to call in both server and client components.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) return null;
  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey);
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return isValidUrl(supabaseUrl) && Boolean(supabaseAnonKey);
}
