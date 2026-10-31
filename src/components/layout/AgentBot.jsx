import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bot, X, Send, Sparkles, Wallet, CalendarClock, Users, FileText, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getAppLanguage } from "@/components/layout/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { LOGO_URL } from "@/components/common/Logo";
import { plainChatText } from "@/lib/chatText";
import { Skeleton } from "@/components/ui/skeleton";
import { agentChatStream, loadAgentChat, clearAgentHistory } from "@/lib/agentChat";

const FAILED = {
  en: "Sorry, I couldn't answer right now. Please try again in a moment.",
  hi: "क्षमा करें, अभी जवाब नहीं दे पाया। कृपया थोड़ी देर में फिर कोशिश करें।",
  gu: "માફ કરશો, હમણાં જવાબ આપી શકાયો નથી. કૃપા કરીને થોડી વારમાં ફરી પ્રયાસ કરો.",
};

const WELCOME = {
  en: "Hi! I'm your Kramasha assistant. I can analyze your events, clients, team payments, and finances, and explain how to use Kramasha. Ask me anything, or use a quick action below.",
  hi: "नमस्ते! मैं आपका क्रमशः सहायक हूँ। मैं आपके इवेंट, क्लाइंट, टीम पेमेंट और फाइनेंस विश्लेषण कर सकता हूँ। कुछ भी पूछें या नीचे दिए त्वरित कार्य का उपयोग करें।",
  gu: "નમસ્તે! હું તમારો ક્રમશઃ સહાયક છું. હું તમારા ઇવેન્ટ, ક્લાયન્ટ, ટીમ પેમેન્ટ અને ફાઇનન્સનું વિશ્લેષણ કરી શકું છું. કંઈપણ પૂછો અથવા નીચેના ક્વિક એક્શનનો ઉપયોગ કરો.",
};

// Shown under the box until the person has sent a first message; sending it counts as agreeing (Terms 5.10, Privacy 2.10).
const CONSENT = {
  en: { a: "By sending a message you agree to our ", terms: "Terms", mid: " and ", privacy: "Privacy Policy", b: ". Your message and the workspace data needed to answer are processed by Google Gemini." },
  hi: { a: "संदेश भेजकर आप हमारी ", terms: "सेवा की शर्तों", mid: " और ", privacy: "गोपनीयता नीति", b: " से सहमत होते हैं। उत्तर देने के लिए आपका संदेश और ज़रूरी वर्कस्पेस डेटा Google Gemini द्वारा प्रोसेस किया जाता है।" },
  gu: { a: "સંદેશ મોકલીને તમે અમારી ", terms: "સેવાની શરતો", mid: " અને ", privacy: "ગોપનીયતા નીતિ", b: " સાથે સંમત થાઓ છો. જવાબ આપવા માટે તમારો સંદેશ અને જરૂરી વર્કસ્પેસ ડેટા Google Gemini દ્વારા પ્રોસેસ થાય છે." },
};
const consentKey = (userId) => `agent-chat-agreed:${userId || ""}`;

const QUICK_ACTIONS = [
  { id: "dues", icon: Wallet, en: "Payment dues", hi: "भुगतान बकाया", gu: "ચુકવણી બાકી", prompt: "List everyone I need to pay and how much is pending (team payment dues). Give exact names and amounts." },
  { id: "upcoming", icon: CalendarClock, en: "Upcoming events", hi: "आगामी इवेंट", gu: "આગામી ઇવેન્ટ", prompt: "List all my upcoming events/projects with dates, clients, and contract value." },
  { id: "clients", icon: Users, en: "Client balances", hi: "क्लाइंट बैलेंस", gu: "ક્લાયન્ટ બેલેન્સ", prompt: "Show me client-wise payment status — total contract, received, and pending balance for each client." },
  { id: "summary", icon: FileText, en: "Business summary", hi: "बिज़नेस सारांश", gu: "બિઝનેસ સારાંશ", prompt: "Give me a quick summary of my business — total events, clients, team members, total income received, total expenses, and pending team payments." },
];

export default function AgentBot() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const [open, setOpen] = useState(false);
  // The panel stays mounted while it slides out, so closing is two steps: "shown" false (slides away), then "open" false.
  const [shown, setShown] = useState(false);
  const [usage, setUsage] = useState(null); // { used, limit } messages today
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false); // the saved conversation is being fetched
  const [agreed, setAgreed] = useState(() => { try { return localStorage.getItem(consentKey(user?.id)) === "1"; } catch { return false; } });
  const scrollRef = useRef(null);
  const language = getAppLanguage(user);

  // Always show the newest message: on every change, and again each time the panel opens or the saved chat finishes loading
  // (the list is a fresh element each time the panel opens, so a change in messages alone would not scroll it).
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open, shown, historyLoading]);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    // The answer's own message is added at once and filled in as it arrives: first the steps being worked through,
    // then the text as it is written. "working" marks it until the final answer replaces it.
    const id = `w${Date.now()}`;
    setMessages((m) => [...m, { role: "user", content: text }, { id, role: "assistant", content: "", working: true, steps: [] }]);
    setInput("");
    if (!agreed) {
      setAgreed(true);
      try { localStorage.setItem(consentKey(user?.id), "1"); } catch { /* the notice just shows again next time */ }
    }
    setLoading(true);
    const update = (fn) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...fn(x) } : x)));
    try {
      const { reply, used, limit } = await agentChatStream({
        message: text, language, workspaceId,
        onStep: (st) => update((x) => ({ steps: [...x.steps.map((q) => ({ ...q, done: true })), { id: st.id, label: st.label, done: false }] })),
        onDelta: (d) => update((x) => ({ content: x.content + d })),
        onReset: () => update(() => ({ content: "" })),
      });
      if (Number.isFinite(used) && Number.isFinite(limit)) setUsage({ used, limit });
      update(() => ({ content: reply || FAILED[language] || FAILED.en, working: false, steps: [] }));
    } catch {
      update((x) => ({ content: x.content || FAILED[language] || FAILED.en, working: false, steps: [] }));
    }
    setLoading(false);
  };

  const handleQuickAction = (action) => {
    send(action.prompt);
  };

  // The welcome message always comes first; the saved conversation (kept on the server) follows it.
  const openPanel = async () => {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    // Already opened before: only the count can be out of date (a new day starts it again at 0), so refresh just that.
    if (messages.length > 0) {
      try {
        const { used, limit } = await loadAgentChat(workspaceId);
        if (Number.isFinite(used) && Number.isFinite(limit)) setUsage({ used, limit });
      } catch { /* keep the count we have */ }
      return;
    }
    const welcome = { role: "assistant", content: WELCOME[language] || WELCOME.en };
    setMessages([welcome]);
    setHistoryLoading(true);
    try {
      const { messages: saved, used, limit } = await loadAgentChat(workspaceId);
      if (Number.isFinite(used) && Number.isFinite(limit)) setUsage({ used, limit });
      if (saved.length) { setMessages([welcome, ...saved]); setAgreed(true); } // they have written to it before
    } catch { /* no saved chat to show — start fresh */ }
    setHistoryLoading(false);
  };

  const closePanel = () => {
    setShown(false);
    setTimeout(() => setOpen(false), 300);
  };

  const clearChat = async () => {
    if (loading) return;
    setMessages([{ role: "assistant", content: WELCOME[language] || WELCOME.en }]);
    try { await clearAgentHistory(workspaceId); } catch { /* the next open will show it again if this failed */ }
  };

  const t = (obj) => obj[language] || obj.en;
  const tr = useT();

  return (
    <>
      <button
        onClick={openPanel}
        className="relative w-9 h-9 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/30 transition-all flex items-center justify-center group"
        aria-label={tr("AI Assistant")}
        title={tr("AI Assistant")}
      >
        <Bot className="w-[18px] h-[18px] text-foreground group-hover:text-primary transition-colors" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className={cn("absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none", shown ? "opacity-100" : "opacity-0")} onClick={closePanel} />
          <div className={cn("relative w-full max-w-sm h-full bg-card border-l border-border flex flex-col shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none", shown ? "translate-x-0" : "translate-x-full")}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2">
                <div className="relative shrink-0">
                  <img src={LOGO_URL} alt="" className="w-9 h-9 rounded-full object-cover border border-border bg-card" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary border-2 border-card flex items-center justify-center">
                    <Sparkles className="w-2 h-2 text-primary-foreground" />
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{tr("Kramasha Assistant")}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {language === "hi" ? "हिंदी में" : language === "gu" ? "ગુજરાતીમાં" : "English"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {messages.length > 1 && (
                  <button
                    onClick={clearChat}
                    disabled={loading}
                    className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                    aria-label={language === "hi" ? "चैट साफ़ करें" : language === "gu" ? "ચેટ સાફ કરો" : "Clear chat"}
                    title={language === "hi" ? "चैट साफ़ करें" : language === "gu" ? "ચેટ સાફ કરો" : "Clear chat"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => closePanel()}
                  className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label={tr("Close")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className="space-y-1.5">
                  {(m.content || !m.working) && (
                    <div className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[88%] px-3 py-2 rounded-lg text-sm",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words leading-relaxed">{m.role === "assistant" ? plainChatText(m.content) : m.content}</div>
                      </div>
                    </div>
                  )}
                  {m.working && (
                    // What it is doing right now: one shimmering line on the plain chat background, not inside a message bubble.
                    // (The steps can arrive almost together, so a list read like 4-5 things at once.)
                    <div className="px-1 text-xs" aria-live="polite">
                      <span key={m.steps?.length ? m.steps[m.steps.length - 1].id : "start"} className="text-shimmer font-medium">
                        {m.steps?.length ? `${m.steps[m.steps.length - 1].label}…` : (language === "hi" ? "शुरू कर रहा हूँ…" : language === "gu" ? "શરૂ કરી રહ્યો છું…" : "Getting started…")}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {historyLoading && (
                // The saved conversation is on its way: placeholder bubbles (yours on the right, the answers on the left).
                <div className="space-y-3" aria-hidden="true">
                  <div className="flex justify-end"><Skeleton className="h-8 w-40 rounded-lg" /></div>
                  <div className="flex justify-start"><Skeleton className="h-16 w-56 rounded-lg" /></div>
                  <div className="flex justify-end"><Skeleton className="h-8 w-28 rounded-lg" /></div>
                </div>
              )}
            </div>

            {messages.length <= 1 && !loading && !historyLoading && (
              <div className="px-3 pb-2">
                <div className="text-[11px] text-muted-foreground font-medium mb-1.5">
                  {language === "hi" ? "त्वरित कार्य" : language === "gu" ? "ક્વિક એક્શન" : "Quick actions"}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_ACTIONS.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.id}
                        onClick={() => handleQuickAction(a)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground hover:bg-muted hover:border-primary/30 transition-colors disabled:opacity-50"
                      >
                        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{t(a)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] border-t border-border">
              {usage && (
                <div className={cn("text-[11px] text-right mb-1.5", usage.used >= usage.limit ? "text-destructive" : "text-muted-foreground")}>
                  {Math.min(usage.used, usage.limit)}/{usage.limit} {tr("messages today")}
                </div>
              )}
              {!agreed && (
                <p className="text-[11px] text-muted-foreground leading-snug mb-2">
                  {(CONSENT[language] || CONSENT.en).a}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">{(CONSENT[language] || CONSENT.en).terms}</a>
                  {(CONSENT[language] || CONSENT.en).mid}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">{(CONSENT[language] || CONSENT.en).privacy}</a>
                  {(CONSENT[language] || CONSENT.en).b}
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={language === "hi" ? "संदेश लिखें…" : language === "gu" ? "સંદેશ લખો…" : "Type a message…"}
                  className="flex-1 h-9 px-3 rounded-lg bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card"
                  disabled={loading}
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  aria-label={tr("Send")}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
