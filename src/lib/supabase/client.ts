import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Check if both are provided
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Trim whitespace
  const trimmedUrl = supabaseUrl.trim();
  const trimmedKey = supabaseAnonKey.trim();

  if (!trimmedUrl || !trimmedKey) {
    return null;
  }

  // Validate URL format - must be HTTP or HTTPS
  try {
    const url = new URL(trimmedUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      console.warn("⚠️ Supabase URL must use HTTP or HTTPS protocol");
      return null;
    }
  } catch (error) {
    console.warn("⚠️ Invalid Supabase URL format:", trimmedUrl);
    return null;
  }

  return { supabaseUrl: trimmedUrl, supabaseAnonKey: trimmedKey };
}

// Client-side supabase instance (lazy initialization)
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return supabaseInstance;
}

// Export untuk backward compatibility (client-side)
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error(
        "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
      );
    }
    return client[prop as keyof SupabaseClient];
  },
});

// Server-side client untuk API routes
export function createServerClient(): SupabaseClient | null {
  try {
    const config = getSupabaseConfig();
    if (!config) {
      // Silent fail - don't log warning if env vars are simply not set
      return null;
    }

    // Double check URL before creating client
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      return null;
    }

    // Additional validation: URL must start with http:// or https://
    if (
      !config.supabaseUrl.startsWith("http://") &&
      !config.supabaseUrl.startsWith("https://")
    ) {
      console.warn(
        "⚠️ Supabase URL must start with http:// or https://. Got:",
        config.supabaseUrl.substring(0, 20) + "..."
      );
      return null;
    }

    // Additional validation: URL must not be empty after trimming
    if (config.supabaseUrl.length < 10) {
      console.warn("⚠️ Supabase URL is too short");
      return null;
    }

    return createClient(config.supabaseUrl, config.supabaseAnonKey);
  } catch (error: any) {
    // Supabase client validation error - catch it here
    if (error.message?.includes("Invalid supabaseUrl")) {
      console.warn(
        "⚠️ Invalid Supabase URL format. Please check NEXT_PUBLIC_SUPABASE_URL in .env.local"
      );
      return null;
    }
    console.error("⚠️ Error creating Supabase client:", error.message);
    return null;
  }
}
