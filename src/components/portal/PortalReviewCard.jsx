import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageSquareHeart, Send, Pencil, Sparkles } from "lucide-react";
import { StarPicker, Stars, RATING_WORDS } from "@/components/reviews/StarRating";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { reviewDay } from "@/components/reviews/ClientReviews";

const REVIEW_MAX = 1000;
const swap = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { type: "spring", stiffness: 380, damping: 32 } };

// The client's one review of the business, like a Google review: stars + optional words, editable any time.
// `review` comes from the server: { open, rating, review, reviewed_at, edited, nudge }.
// `send(rating, text)` resolves to { review: newState }.
export function ReviewForm({ review, businessName, send, preview = false, onChange }) {
  const [state, setStateRaw] = useState(review);
  const [editing, setEditing] = useState(!review?.rating);
  const [rating, setRating] = useState(review?.rating || 0);
  const [text, setText] = useState(review?.review || "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const setState = (next) => { setStateRaw(next); onChange?.(next); };

  if (!state || (!state.open && !state.rating)) return null;

  const startEdit = () => { setRating(state.rating || 0); setText(state.review || ""); setError(""); setEditing(true); };
  const submit = async (e) => {
    e.preventDefault();
    if (!rating || sending || preview) return;
    setSending(true);
    setError("");
    try {
      const res = await send(rating, text.trim());
      setState(res?.review?.rating ? res.review : { ...state, rating, review: text.trim(), reviewed_at: new Date().toISOString(), edited: !!state.rating, nudge: "" });
      setEditing(false);
    } catch (err) {
      setError(err?.message || "Couldn't send your review. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!editing && state.rating ? (
        <motion.div key="done" {...swap} className="space-y-3">
          {state.nudge && (
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground"><span className="font-medium">{state.nudge}</span> is done too. Want to update your review?</p>
                <button type="button" onClick={startEdit} disabled={preview} className="mt-1.5 text-xs font-semibold text-primary hover:text-primary-hover disabled:opacity-50">Update review</button>
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Stars value={state.rating} size="md" />
              <span className="text-xs font-medium text-foreground">{RATING_WORDS[state.rating]}</span>
              {state.reviewed_at && <span className="text-xs text-muted-foreground">· {formatDate(reviewDay(state.reviewed_at))}{state.edited ? " · Edited" : ""}</span>}
            </div>
            {state.review && <p className="text-sm text-foreground mt-2 whitespace-pre-line break-words">“{state.review}”</p>}
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-success">Thank you{businessName ? `, it means a lot to ${businessName}` : ""}.</span>
            <button type="button" onClick={startEdit} disabled={preview} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-muted disabled:opacity-50">
              <Pencil className="w-3.5 h-3.5" /> Edit review
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.form key="form" {...swap} onSubmit={submit} className="space-y-3">
          <div>
            <StarPicker value={rating} onChange={setRating} disabled={sending || preview} />
            <div className="h-4 mt-1 text-xs font-medium text-muted-foreground">{rating ? RATING_WORDS[rating] : "Tap a star to rate"}</div>
          </div>
          <AnimatePresence initial={false}>
            {rating > 0 && (
              <motion.div key="more" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }} className="overflow-hidden">
                <div className="space-y-3 pt-0.5">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, REVIEW_MAX))}
                    placeholder="Tell others about your experience (optional)"
                    rows={3}
                    disabled={sending || preview}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">{businessName ? `${businessName} may show it on their page with your name. ` : ""}You can edit it any time.</span>
                    <div className="flex items-center gap-2">
                      {state.rating && (
                        <button type="button" onClick={() => { setEditing(false); setError(""); }} disabled={sending} className="h-9 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                      )}
                      <button type="submit" disabled={sending || preview} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? "Sending…" : state.rating ? "Save changes" : "Post review"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {preview && <p className="text-[11px] text-muted-foreground">Preview: your client can review you here once their first one is over.</p>}
        </motion.form>
      )}
    </AnimatePresence>
  );
}

// Card for the Client Portal, the project portal and the Track page.
export default function PortalReviewCard({ review, businessName, send, preview = false, className }) {
  const [rated, setRated] = useState(!!review?.rating);
  if (!review || (!review.open && !review.rating)) return null;
  return (
    <div className={cn("bg-card border border-border rounded-[15px] p-5 shadow-card", className)}>
      <div className="flex items-center gap-2 mb-1">
        <MessageSquareHeart className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{rated ? "Your review" : "How was your experience?"}</h3>
      </div>
      {!rated && <p className="text-xs text-muted-foreground mb-3">{businessName ? `Rate ${businessName} and help others choose.` : "Rate your experience."}</p>}
      <div className={rated ? "mt-2" : ""}>
        <ReviewForm review={review} businessName={businessName} send={send} preview={preview} onChange={(next) => setRated(!!next?.rating)} />
      </div>
    </div>
  );
}
