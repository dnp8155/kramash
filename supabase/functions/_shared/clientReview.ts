// Client reviews (migration 0077): one per client, like a Google review, editable any time.
// Reads the client's review and events, then applies the rules in reviewRules.ts.
import { supabaseAdmin } from "./supabaseClient.ts";
import { buildReviewState } from "./reviewRules.ts";

export { REVIEW_MAX_LENGTH, reviewNotifyChannels } from "./reviewRules.ts";

export async function clientReviewState(clientId: string | null | undefined, workspaceId: string, timezone?: string | null, anytime = false) {
  const empty = { open: false, rating: null, review: "", reviewed_at: "", edited: false, nudge: "" };
  if (!clientId) return empty;
  const { data: client, error } = await supabaseAdmin.from("clients")
    .select("review_rating, review_text, review_created_at, review_updated_at")
    .eq("id", clientId).eq("workspace_id", workspaceId).maybeSingle();
  if (error || !client) return empty; // before migration 0077 the columns do not exist
  const { data: events } = await supabaseAdmin.from("events").select("title, status, event_dates, start_date, end_date, updated_at")
    .eq("workspace_id", workspaceId).eq("client_id", clientId).limit(200);
  return buildReviewState(client, events || [], timezone, anytime);
}
