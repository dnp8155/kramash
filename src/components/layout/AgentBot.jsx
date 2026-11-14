import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildLinkIndex } from "@/lib/chatText";
import { createPortal } from "react-dom";
import { Bot, Loader2, X, Send, Sparkles, Wallet, CalendarClock, Users, FileText, Trash2, TrendingUp, Receipt, CalendarDays, CircleHelp, Star } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getAppLanguage } from "@/components/layout/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { LOGO_URL } from "@/components/common/Logo";
import ChatRichText from "@/components/common/ChatRichText";
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

// Ideas shown when a chat starts. A few are picked at random each time, so the box never looks the same twice.
// `topic` decides which follow-ups come next. `prompt` (when given) is the fuller question sent instead of the label.
const STARTERS = [
  { id: "dues", topic: "dues", icon: Wallet, en: "Payment dues", hi: "भुगतान बकाया", gu: "ચુકવણી બાકી", prompt: "List everyone I need to pay and how much is pending (team payment dues). Give exact names and amounts." },
  { id: "upcoming", topic: "events", icon: CalendarClock, en: "Upcoming events", hi: "आगामी इवेंट", gu: "આગામી ઇવેન્ટ", prompt: "List all my upcoming events/projects with dates, clients, and contract value." },
  { id: "clients", topic: "clients", icon: Users, en: "Client balances", hi: "क्लाइंट बैलेंस", gu: "ક્લાયન્ટ બેલેન્સ", prompt: "Show me client-wise payment status — total contract, received, and pending balance for each client." },
  { id: "summary", topic: "finance", icon: FileText, en: "Business summary", hi: "बिज़नेस सारांश", gu: "બિઝનેસ સારાંશ", prompt: "Give me a quick summary of my business — total events, clients, team members, total income received, total expenses, and pending team payments." },
  { id: "profit", topic: "finance", icon: TrendingUp, en: "Profit this year", hi: "इस साल का मुनाफा", gu: "આ વર્ષનો નફો" },
  { id: "expenses", topic: "finance", icon: Receipt, en: "Biggest expenses", hi: "सबसे बड़े खर्च", gu: "સૌથી મોટા ખર્ચ" },
  { id: "week", topic: "events", icon: CalendarDays, en: "Events this week", hi: "इस हफ्ते के इवेंट", gu: "આ અઠવાડિયાની ઇવેન્ટ" },
  { id: "free", topic: "team", icon: Users, en: "Who is free this weekend?", hi: "वीकेंड पर कौन खाली है?", gu: "સપ્તાહાંતે કોણ ફ્રી છે?" },
  { id: "top", topic: "clients", icon: Star, en: "My top clients", hi: "मेरे टॉप क्लाइंट", gu: "મારા ટોચના ક્લાયન્ટ" },
  { id: "quote", topic: "howto", icon: CircleHelp, en: "How do I send a quotation?", hi: "कोटेशन कैसे भेजूँ?", gu: "ક્વોટેશન કેવી રીતે મોકલવું?" },
];

// Short questions offered under an answer, by what the chat is about, so it is easy to keep going.
const FOLLOW_UPS = {
  dues: [
    { en: "Who should I pay first?", hi: "मुझे सबसे पहले किसे भुगतान करना चाहिए?", gu: "મારે સૌથી પહેલા કોને ચૂકવણી કરવી જોઈએ?" },
    { en: "Show client balances", hi: "क्लाइंट बैलेंस दिखाओ", gu: "ક્લાયન્ટ બેલેન્સ બતાવો" },
    { en: "Which payments are overdue?", hi: "कौन से भुगतान समय से पीछे हैं?", gu: "કઈ ચુકવણી મુદત વટાવી ગઈ છે?" },
    { en: "Total pending this month", hi: "इस महीने कुल बकाया", gu: "આ મહિને કુલ બાકી" },
  ],
  events: [
    { en: "Which day is busiest this month?", hi: "इस महीने सबसे व्यस्त दिन कौन सा है?", gu: "આ મહિનાનો સૌથી વ્યસ્ત દિવસ કયો છે?" },
    { en: "Who is free this weekend?", hi: "वीकेंड पर कौन खाली है?", gu: "સપ્તાહાંતે કોણ ફ્રી છે?" },
    { en: "Show events with pending payment", hi: "बकाया वाले इवेंट दिखाओ", gu: "બાકી ચુકવણીવાળી ઇવેન્ટ બતાવો" },
    { en: "Any events this week?", hi: "इस हफ्ते कोई इवेंट है?", gu: "આ અઠવાડિયે કોઈ ઇવેન્ટ છે?" },
  ],
  clients: [
    { en: "Which client owes the most?", hi: "किस क्लाइंट का सबसे ज्यादा बकाया है?", gu: "કયા ક્લાયન્ટનું સૌથી વધુ બાકી છે?" },
    { en: "Who are my top clients?", hi: "मेरे टॉप क्लाइंट कौन हैं?", gu: "મારા ટોચના ક્લાયન્ટ કોણ છે?" },
    { en: "Show upcoming events", hi: "आगामी इवेंट दिखाओ", gu: "આગામી ઇવેન્ટ બતાવો" },
    { en: "Total pending this month", hi: "इस महीने कुल बकाया", gu: "આ મહિને કુલ બાકી" },
  ],
  finance: [
    { en: "What is my profit this year?", hi: "इस साल मेरा मुनाफा कितना है?", gu: "આ વર્ષે મારો નફો કેટલો છે?" },
    { en: "What are my biggest expenses?", hi: "मेरे सबसे बड़े खर्च कौन से हैं?", gu: "મારા સૌથી મોટા ખર્ચ કયા છે?" },
    { en: "Cash vs online split", hi: "कैश बनाम ऑनलाइन", gu: "કેશ વિ. ઓનલાઇન" },
    { en: "Show payment dues", hi: "भुगतान बकाया दिखाओ", gu: "ચુકવણી બાકી બતાવો" },
  ],
  team: [
    { en: "How much did I pay my team?", hi: "टीम को मैंने कुल कितना दिया?", gu: "ટીમને મેં કુલ કેટલું ચૂકવ્યું?" },
    { en: "Who worked the most events?", hi: "सबसे ज्यादा इवेंट किसने किए?", gu: "સૌથી વધુ ઇવેન્ટ કોણે કરી?" },
    { en: "Show team payment dues", hi: "टीम का बकाया दिखाओ", gu: "ટીમની બાકી ચુકવણી બતાવો" },
  ],
  howto: [
    { en: "How do I record a payment?", hi: "भुगतान कैसे दर्ज करूँ?", gu: "ચુકવણી કેવી રીતે નોંધવી?" },
    { en: "How do I block a date for leave?", hi: "छुट्टी के लिए तारीख कैसे ब्लॉक करूँ?", gu: "રજા માટે તારીખ કેવી રીતે બ્લોક કરવી?" },
    { en: "How do I add a team member?", hi: "टीम मेंबर कैसे जोड़ूँ?", gu: "ટીમ મેમ્બર કેવી રીતે ઉમેરવો?" },
  ],
  general: [
    { en: "Show payment dues", hi: "भुगतान बकाया दिखाओ", gu: "ચુકવણી બાકી બતાવો" },
    { en: "Show upcoming events", hi: "आगामी इवेंट दिखाओ", gu: "આગામી ઇવેન્ટ બતાવો" },
    { en: "What is my profit this year?", hi: "इस साल मेरा मुनाफा कितना है?", gu: "આ વર્ષે મારો નફો કેટલો છે?" },
  ],
};

const shuffle = (list) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickStarters = () => shuffle(STARTERS).slice(0, 4);

// What a typed question is about, so the follow-ups fit it.
function detectTopic(text) {
  const s = String(text || "").toLowerCase();
  if (/\b(how (do|to|can)|where|kaise|कैसे|કેવી)\b/.test(s)) return "howto";
  if (/(due|pending|owe|overdue|बकाया|बाकी|બાકી)/.test(s)) return /(team|member|टीम|ટીમ)/.test(s) ? "team" : "dues";
  if (/(team|member|photographer|टीम|ટીમ)/.test(s)) return "team";
  if (/(client|customer|क्लाइंट|ક્લાયન્ટ)/.test(s)) return "clients";
  if (/(event|upcoming|booking|schedule|week|इवेंट|ઇવેન્ટ)/.test(s)) return "events";
  if (/(profit|expense|income|revenue|cash|summary|मुनाफा|खर्च|નફો|ખર્ચ)/.test(s)) return "finance";
  return "general";
}

// Up to three follow-ups for a topic, in random order, leaving out anything already asked in this chat.
function pickFollowUps(topic, askedTexts) {
  const asked = new Set(askedTexts.map((x) => String(x).trim().toLowerCase()));
  const fresh = (list) => shuffle(list).filter((f) => !["en", "hi", "gu"].some((l) => asked.has(f[l].toLowerCase())));
  const first = fresh(FOLLOW_UPS[topic] || FOLLOW_UPS.general).slice(0, 3);
  return first.length >= 2 ? first : [...first, ...fresh(FOLLOW_UPS.general)].slice(0, 3);
}

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
  const [starters, setStarters] = useState(pickStarters); // ideas shown at the start of a chat (a random few each time)
  const [followUps, setFollowUps] = useState([]); // related questions offered under the latest answer
  const [agreed, setAgreed] = useState(() => { try { return localStorage.getItem(consentKey(user?.id)) === "1"; } catch { return false; } });
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  // Whether the panel is open right now (false the moment it starts closing). Read after an answer arrives.
  const openRef = useRef(false);
  const unreadKey = `agent-chat-unread:${user?.id || ""}`;
  // A red dot on the bot icon when an answer arrived while the panel was closed. Kept on this device until it is opened.
  const [unread, setUnread] = useState(() => { try { return localStorage.getItem(unreadKey) === "1"; } catch { return false; } });
  // The ripple around the dot plays only when a reply has just arrived (a few waves), then stops; the dot itself stays.
  // A dot restored after a reload gets no ripple.
  const [ripple, setRipple] = useState(false);
  const markUnread = (on) => {
    setUnread(on);
    setRipple(on);
    try { on ? localStorage.setItem(unreadKey, "1") : localStorage.removeItem(unreadKey); } catch { /* the dot just won't survive a reload */ }
  };
  const language = getAppLanguage(user);

  // Always show the newest message: on every change, and again each time the panel opens or the saved chat finishes loading
  // (the list is a fresh element each time the panel opens, so a change in messages alone would not scroll it).
  // A new message glides into view; text arriving word by word just keeps the bottom in sight (a glide on every word would stutter).
  const lastCount = useRef(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) { lastCount.current = 0; return; }
    const grew = messages.length > lastCount.current && lastCount.current > 1;
    lastCount.current = messages.length;
    if (grew) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    else el.scrollTop = el.scrollHeight;
  }, [messages, loading, open, shown, historyLoading]);

  const send = async (overrideText, topic) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const askedBefore = [...messages.filter((m) => m.role === "user").map((m) => m.content), text];
    setFollowUps([]);
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
      // Offer a few related questions so the conversation is easy to keep going.
      if (reply) setFollowUps(pickFollowUps(topic || detectTopic(text), askedBefore));
    } catch {
      update((x) => ({ content: x.content || FAILED[language] || FAILED.en, working: false, steps: [] }));
    }
    setLoading(false);
    // The answer is in. If the panel was closed meanwhile, flag it on the icon; if it is open, put the cursor back in the box.
    if (openRef.current) requestAnimationFrame(() => inputRef.current?.focus());
    else markUnread(true);
  };

  const handleQuickAction = (action) => {
    send(action.prompt || action[language] || action.en, action.topic);
  };

  // The welcome message always comes first; the saved conversation (kept on the server) follows it.
  const openPanel = async () => {
    openRef.current = true;
    markUnread(false);
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
    setStarters(pickStarters());
    setHistoryLoading(true);
    try {
      const { messages: saved, used, limit } = await loadAgentChat(workspaceId);
      if (Number.isFinite(used) && Number.isFinite(limit)) setUsage({ used, limit });
      if (saved.length) { setMessages([welcome, ...saved]); setAgreed(true); } // they have written to it before
    } catch { /* no saved chat to show — start fresh */ }
    setHistoryLoading(false);
  };

  // Names of your events, clients and team, read only while the panel is open, so replies can offer an "Open" link.
  const navigate = useNavigate();
  const { data: linkData } = useQuery({
    queryKey: ["bot-links", workspaceId],
    enabled: !!workspaceId && open,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const ws = { workspace_id: workspaceId };
      const soft = (p) => p.catch(() => []);
      const [events, clients, members] = await Promise.all([
        soft(base44.entities.Event.filter(ws, "-created_date", 500)),
        soft(base44.entities.Client.filter(ws, "name", 500)),
        soft(base44.entities.TeamMember.filter(ws, "name", 200)),
      ]);
      return { events: events || [], clients: clients || [], members: members || [] };
    },
  });
  const linkIndex = useMemo(() => buildLinkIndex(linkData || {}), [linkData]);
  // First time the round arrow buttons show up, a short note explains them. Once seen (tapped one, or closed the chat after seeing
  // it), it is not shown again on this device.
  const hintKey = "agent-link-hint-seen";
  const [hintSeen, setHintSeen] = useState(() => { try { return localStorage.getItem(hintKey) === "1"; } catch { return false; } });
  const [hintOwner, setHintOwner] = useState(null); // index of the reply that carries the note
  const markHintSeen = () => { setHintSeen(true); try { localStorage.setItem(hintKey, "1"); } catch { /* shown again next time */ } };
  const openLink = (to) => { markHintSeen(); closePanel(); navigate(to); };

  const closePanel = () => {
    if (hintOwner !== null && !hintSeen) markHintSeen();
    openRef.current = false;
    setShown(false);
    setTimeout(() => setOpen(false), 300);
  };

  const clearChat = async () => {
    if (loading) return;
    setFollowUps([]);
    setStarters(pickStarters());
    setMessages([{ role: "assistant", content: WELCOME[language] || WELCOME.en }]);
    try { await clearAgentHistory(workspaceId); } catch { /* the next open will show it again if this failed */ }
  };

  const t = (obj) => obj[language] || obj.en;
  const tr = useT();
  const working = loading && !open;

  return (
    <>
      <button
        onClick={openPanel}
        className="relative w-9 h-9 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/30 transition-all flex items-center justify-center group"
        aria-label={unread ? `${tr("AI Assistant")} · ${language === "hi" ? "नया जवाब" : language === "gu" ? "નવો જવાબ" : "new reply"}` : tr("AI Assistant")}
        title={tr("AI Assistant")}
      >
        {/* Same as the app's Syncing icon: while an answer is being worked on (panel closed) the bot icon turns and
            shrinks away into a small spinner, and morphs back when the reply is in. */}
        <span className="relative block w-[18px] h-[18px]">
          <span className={cn("absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-300 motion-reduce:transition-none", working ? "opacity-0 scale-50 -rotate-90" : "opacity-100 scale-100 rotate-0")}>
            <Bot className="w-[18px] h-[18px] text-foreground group-hover:text-primary transition-colors" />
          </span>
          <span className={cn("absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-300 motion-reduce:transition-none", working ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-90")}>
            <Loader2 className="w-4 h-4 animate-spin text-primary motion-reduce:animate-none" />
          </span>
        </span>
        {unread && (
          <span className="absolute -top-0.5 -right-0.5 flex w-3 h-3" aria-hidden="true">
            <span className="absolute inline-flex w-full h-full rounded-full bg-destructive opacity-60 motion-reduce:animate-none" style={ripple ? { animation: "bot-dot-ripple 1s cubic-bezier(0, 0, 0.2, 1) 1 forwards" } : { opacity: 0 }} />
            <span className="relative inline-flex w-3 h-3 rounded-full bg-destructive border-2 border-card" />
          </span>
        )}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className={cn("absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none", shown ? "opacity-100" : "opacity-0")} onClick={closePanel} />
          <div className={cn("relative w-full max-w-sm h-full bg-card border-l border-y border-border rounded-l-[15px] overflow-hidden flex flex-col shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none", shown ? "translate-x-0" : "translate-x-full")}>
            {/* Same header pattern as the app's dialogs: plain card, rounded-square logo, title + one quiet line, round icon buttons. */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <img src={LOGO_URL} alt="" className="w-10 h-10 shrink-0 rounded-xl object-cover border border-border bg-card" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight text-foreground truncate">{tr("Kramasha Assistant")}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {language === "hi" ? "अपने बिज़नेस के बारे में पूछें" : language === "gu" ? "તમારા બિઝનેસ વિશે પૂછો" : "Ask about your business"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
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
                <div key={i} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
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
                        <div className="whitespace-pre-wrap break-words leading-relaxed">{m.role === "assistant" ? <ChatRichText text={m.content} linkIndex={linkIndex} onOpen={openLink}
                          hint={!hintSeen && hintOwner === i ? (language === "hi" ? "नाम के पास के गोल तीर वाले बटन से उसे खोलें।" : language === "gu" ? "નામ પાસેના ગોળ તીરવાળા બટનથી તેને ખોલો." : "Tap the round arrow button next to a name to open it.") : null}
                          onHasLinks={() => setHintOwner((o) => (o === null && !hintSeen ? i : o))} /> : m.content}</div>
                      </div>
                    </div>
                  )}
                  {m.working && (
                    // What it is doing right now: one shimmering line on the plain chat background, not inside a message bubble.
                    // (The steps can arrive almost together, so a list read like 4-5 things at once.)
                    <div className="px-1 text-sm flex items-center gap-2 animate-in fade-in duration-300 motion-reduce:animate-none" aria-live="polite">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                      <span key={m.steps?.length ? m.steps[m.steps.length - 1].id : "start"} className="text-shimmer font-medium animate-in fade-in duration-300">
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
              {followUps.length > 0 && !loading && !historyLoading && (
                <div className="flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
                  {followUps.map((f) => (
                    <button
                      key={f.en}
                      onClick={() => send(f[language] || f.en, detectTopic(f.en))}
                      className="px-2.5 py-1 rounded-full border border-border bg-card text-xs text-foreground hover:bg-muted hover:border-primary/30 transition-colors text-left"
                    >
                      {t(f)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {messages.length <= 1 && !loading && !historyLoading && (
              <div className="px-3 pb-2">
                <div className="text-[11px] text-muted-foreground font-medium mb-1.5">
                  {language === "hi" ? "ये पूछ सकते हैं" : language === "gu" ? "આ પૂછી શકો" : "Try asking"}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {starters.map((a) => {
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
              {(usage || loading) && (
                <div className="flex items-center justify-between gap-3 text-[11px] mb-1.5">
                  <span className="text-muted-foreground min-w-0">
                    {loading ? (language === "hi" ? "आप इसे बंद करके काम जारी रख सकते हैं। जवाब आने पर लाल बिंदु दिखेगा।"
                      : language === "gu" ? "તમે આને બંધ કરીને કામ ચાલુ રાખી શકો છો. જવાબ આવતાં લાલ ટપકું દેખાશે."
                      : "You can close this and keep working. A red dot shows when the reply is ready.") : ""}
                  </span>
                  {usage && (
                    <span className={cn("shrink-0", usage.used >= usage.limit ? "text-destructive" : "text-muted-foreground")}>
                      {Math.min(usage.used, usage.limit)}/{usage.limit} {tr("messages today")}
                    </span>
                  )}
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
                  ref={inputRef}
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
