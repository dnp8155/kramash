// Shared Supabase admin client for Base44 backend functions.
// Uses the service role key to bypass RLS (equivalent to original supabaseAdmin).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { secrets } from 'base44:runtime';

let cachedClient = null;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;
  const url = secrets.get("SUPABASE_URL");
  const serviceKey = secrets.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY secrets are required. Set them in dashboard → Secrets.");
  }
  cachedClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

// Extract the authenticated user from the request's Authorization header.
// In Base44 backend functions, the Base44 SDK passes the user token.
// We use createClientFromRequest to get the Base44 user, then match to Supabase by email.
export async function getUserFromRequest(req) {
  try {
    const { createClientFromRequest } = await import('npm:@base44/sdk@0.8.49');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return null;
    // The Base44 user has an email; find the matching Supabase profile by email.
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("email", user.email)
      .limit(1);
    if (profile && profile.length > 0) return profile[0];
    // Fallback: return a minimal user object from the Base44 user
    return { id: user.id, email: user.email, full_name: user.full_name, role: user.role };
  } catch {
    return null;
  }
}