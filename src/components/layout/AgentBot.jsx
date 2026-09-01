import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bot, X, Send, Sparkles, Paperclip, Wallet, CalendarClock, Users, FileText, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { uploadFileWithLimit } from "@/lib/storageService";
import { getAppLanguage } from "@/components/layout/LanguageSwitcher";
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
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const language = getAppLanguage(user);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text, files: files.map((f) => f.name) };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    const sentFiles = files;
    setFiles([]);
    setLoading(true);
    try {
      const res = await base44.functions.invoke("agentChat", {
        message: text,
        language,
        history: messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content })),
        file_urls: sentFiles.map((f) => f.url),
      });
      const reply = res?.data?.reply || res?.reply || "Sorry, I couldn't generate a response.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    send(action.prompt);
  };

  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of selected) {
        if (file.size > 10 * 1024 * 1024) {
          setMessages((m) => [...m, { role: "assistant", content: `File "${file.name}" is too large (max 10MB).` }]);
          continue;
        }
        const result = await uploadFileWithLimit(workspaceId, file);
        if (result.error) {
          setMessages((m) => [...m, { role: "assistant", content: `Storage limit reached — upgrade your plan to upload more files. ("${file.name}" not uploaded)` }]);
          continue;
        }
        uploaded.push({ name: file.name, url: result.file_url });
      }
      setFiles((f) => [...f, ...uploaded]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: "Failed to upload file. Please try again." }]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (idx) => setFiles((f) => f.filter((_, i) => i !== idx));

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
        className="relative p-1.5 rounded-md hover:bg-muted transition-colors"
        aria-label="AI Assistant"
        title="AI Assistant"
      >
        <Bot className="w-5 h-5 text-foreground" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-card border-l border-border flex flex-col shadow-xl animate-fade-in">
            {/* Header */}
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
                className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
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
                    {m.files?.length > 0 && (
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        {m.files.map((fn, fi) => (
                          <span key={fi} className="inline-flex items-center gap-1 text-[11px] bg-primary-foreground/15 rounded px-1.5 py-0.5">
                            <Paperclip className="w-2.5 h-2.5" /> {fn}
                          </span>
                        ))}
                      </div>
                    )}
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

            {/* Quick actions */}
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

            {/* Uploaded files */}
            {files.length > 0 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted border border-border rounded-md pl-2 pr-1 py-1">
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploading}
                  className="w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                  aria-label="Attach file"
                  title={language === "hi" ? "फ़ाइल अटैच करें (इमेज, PDF)" : language === "gu" ? "ફાઇલ જોડો (ઇમેજ, PDF)" : "Attach file (image, PDF)"}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
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
                  disabled={loading || (!input.trim() && files.length === 0)}
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