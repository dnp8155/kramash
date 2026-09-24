import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bot, X, Send, Sparkles, Wallet, CalendarClock, Users, FileText } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getAppLanguage } from "@/components/layout/LanguageSwitcher";
import { agentChat } from "@/lib/agentChat";
import { cn } from "@/lib/utils";

const WELCOME = {
  en: "Hi! I'm your Kramasha assistant. I can analyze your events, clients, team payments, and finances. Ask me anything, or use a quick action below.",
  hi: "नमस्ते! मैं आपका क्रमशः सहायक हूँ। मैं आपके इवेंट, क्लाइंट, टीम पेमेंट और फाइनेंस विश्लेषण कर सकता हूँ। कुछ भी पूछें या नीचे दिए त्वरित कार्य का उपयोग करें।",
  gu: "નમસ્તે! હું તમારો ક્રમશઃ સહાયક છું. હું તમારા ઇવેન્ટ, ક્લાયન્ટ, ટીમ પેમેન્ટ અને ફાઇનન્સનું વિશ્લેષણ કરી શકું છું. કંઈપણ પૂછો અથવા નીચેના ક્વિક એક્શનનો ઉપયોગ કરો.",
};

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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const language = getAppLanguage(user);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await agentChat({
        message: text,
        language,
        workspaceId,
        history: messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content })),
      });
      const reply = res?.reply || "Sorry, I couldn't generate a response.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("api key") || msg.includes("setup") || msg.includes("llmconfig")) {
        setMessages((m) => [...m, { role: "assistant", content: "AI Assistant अभी सेटअप बाकी है। src/lib/llmConfig.js में अपनी Gemini API key डालें (aistudio.google.com/apikey पर फ्री key बनाएं)।" }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: "कुछ गड़बड़ हुई। फिर से कोशिश करें।" }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    send(action.prompt);
  };

  const openPanel = () => {
    setOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: WELCOME[language] || WELCOME.en }]);
    }
  };

  const t = (obj) => obj[language] || obj.en;

  return (
    <>
      <button
        onClick={openPanel}
        className="relative w-9 h-9 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/30 transition-all flex items-center justify-center group"
        aria-label="AI Assistant"
        title="AI Assistant"
      >
        <Bot className="w-[18px] h-[18px] text-foreground group-hover:text-primary transition-colors" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-card border-l border-border flex flex-col shadow-xl animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Kramasha Assistant</div>
                  <div className="text-[11px] text-muted-foreground">
                    {language === "hi" ? "हिंदी में" : language === "gu" ? "ગુજરાતીમાં" : "English"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[88%] px-3 py-2 rounded-lg text-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted px-3 py-2 rounded-lg rounded-bl-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 1 && !loading && (
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

            <div className="p-3 border-t border-border">
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
                  className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  aria-label="Send"
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