import { useEffect, useState } from "react";
import { openWhatsApp } from "@/lib/openWhatsApp";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, MessageSquare, Link2, Loader2 } from "lucide-react";
import Button from "@/components/common/Button";
import { generateAccessToken } from "@/lib/clientPortalAccess";
import { whatsappShareUrl } from "@/lib/portalShare";
import { whatsappNumber } from "@/lib/validation";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { trackSaving } from "@/lib/savingTracker";
import { useToast } from "@/components/ui/use-toast";
import Toggle from "@/components/common/Toggle";
import { Stars, RATING_WORDS } from "@/components/reviews/StarRating";
import { formatDate } from "@/lib/dates";
import { useT } from "@/hooks/useT";

const COLUMNS = "id, name, review_rating, review_text, review_created_at, review_updated_at, review_on_profile";

// Every client review in this workspace (one per client, like a Google review), newest first.
// Fails (isError) before migration 0077, so pages can hide the review card instead of offering a link that can't work.
export function useClientReviews(workspaceId) {
  return useQuery({
    queryKey: ["clientReviews", workspaceId],
    enabled: !!workspaceId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select(COLUMNS)
        .eq("workspace_id", workspaceId).not("review_rating", "is", null)
        .order("review_updated_at", { ascending: false }).limit(500);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}

// The day a review was written, in this device's time zone (the stored time is UTC).
export const reviewDay = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Switch one review on/off for the public My Profile page. Updates the list at once; puts it back if the save fails
// (including a save the database quietly skipped: no row came back).
export function useToggleReviewOnProfile(workspaceId) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return async (clientId, on) => {
    const key = ["clientReviews", workspaceId];
    const prev = queryClient.getQueryData(key);
    queryClient.setQueryData(key, (list) => (list || []).map((r) => (r.id === clientId ? { ...r, review_on_profile: on } : r)));
    const { data, error } = await trackSaving(() => supabase.from("clients").update({ review_on_profile: on }).eq("id", clientId).eq("workspace_id", workspaceId).select("id"));
    if (error || !data?.length) {
      queryClient.setQueryData(key, prev);
      toast({ title: "Couldn't update the review", description: error?.message || "You may not have permission to change this client.", variant: "destructive" });
    }
  };
}

// Makes the client's review link once and returns its token. Never replaces a link that already exists (it may have
// been sent already): the write only applies while the token is empty, and the saved token is read back.
async function ensureReviewToken(clientId, workspaceId) {
  const fresh = generateAccessToken();
  const { data, error } = await trackSaving(() => supabase.from("clients").update({ review_token: fresh })
    .eq("id", clientId).eq("workspace_id", workspaceId).is("review_token", null).select("review_token"));
  if (error) throw new Error(error.message);
  if (data?.[0]?.review_token) return data[0].review_token;
  const { data: row, error: readError } = await supabase.from("clients").select("review_token").eq("id", clientId).eq("workspace_id", workspaceId).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (row?.review_token) return row.review_token;
  throw new Error("You may not have permission to change this client.");
}

// "Ask for a review": the client's own review link (/review/<token>), for clients without the Client Portal.
// The link is made (and confirmed saved) first; only then can it be copied or sent, so a client never gets a dead link.
// The same link lets the client edit their review later.
export function ReviewLinkActions({ client, workspaceId, businessName, onSaved }) {
  const t = useT();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState(client?.review_token || "");
  const [making, setMaking] = useState(false);
  useEffect(() => { if (client?.review_token) setToken(client.review_token); }, [client?.review_token]);

  const make = async () => {
    setMaking(true);
    try {
      setToken(await ensureReviewToken(client.id, workspaceId));
      onSaved?.();
    } catch (e) {
      toast({ title: t("Couldn't make the review link"), description: e?.message, variant: "destructive" });
    } finally {
      setMaking(false);
    }
  };

  if (!token) {
    return (
      <Button size="sm" variant="outline" onClick={make} disabled={making}>
        {making ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} {t("Create review link")}
      </Button>
    );
  }

  const url = `${window.location.origin}/review/${token}`;
  const firstName = String(client?.name || "").trim().split(/\s+/)[0];
  const message = `Hi${firstName ? ` ${firstName}` : ""}, thank you for choosing ${businessName || "us"}! We would love to hear how it went. Please leave a quick review here (you can edit it later from the same link):\n${url}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast({ title: t("Review link copied"), description: t("Send it to the client. They can open it any time.") });
    } catch {
      toast({ title: t("Couldn't copy"), description: url });
    }
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {t("Copy review link")}</Button>
      <Button size="sm" variant="outline" onClick={() => openWhatsApp(whatsappShareUrl(whatsappNumber(client?.phone || ""), message))}><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</Button>
    </div>
  );
}

const isEdited = (r) => !!r.review_created_at && !!r.review_updated_at && r.review_updated_at > r.review_created_at;

// Reviews as rows: stars, who wrote it (when showClient), the words, and the "Show on My Profile" switch.
export function ReviewRows({ reviews, workspaceId, showClient = false }) {
  const t = useT();
  const toggle = useToggleReviewOnProfile(workspaceId);
  return (
    <div className="divide-y divide-border">
      {reviews.map((r) => (
        <div key={r.id} className="py-3.5 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Stars value={r.review_rating} size="md" />
                <span className="text-xs font-medium text-foreground">{t(RATING_WORDS[r.review_rating] || "")}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 break-words">
                {showClient && <><Link to={`/clients/${r.id}`} className="font-medium text-foreground hover:underline">{r.name}</Link>{" · "}</>}
                {r.review_updated_at ? formatDate(reviewDay(r.review_updated_at)) : ""}
                {isEdited(r) ? ` · ${t("Edited")}` : ""}
              </div>
            </div>
            <label className="flex items-center gap-2 shrink-0 cursor-pointer">
              <span className="text-[11px] text-muted-foreground text-right leading-tight hidden min-[380px]:block">{t("Show on My Profile")}</span>
              <Toggle checked={!!r.review_on_profile} onChange={(v) => toggle(r.id, v)} label={t("Show on My Profile")} />
            </label>
          </div>
          {r.review_text && <p className="text-sm text-foreground mt-2 whitespace-pre-line break-words">“{r.review_text}”</p>}
        </div>
      ))}
    </div>
  );
}
