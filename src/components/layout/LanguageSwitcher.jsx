import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { getAppLanguage } from "@/lib/i18n";

const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिन्दी", short: "हि" },
  { code: "gu", label: "ગુજરાતી", short: "ગુ" },
];

export { getAppLanguage };

export default function LanguageSwitcher() {
  const { user, checkUserAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);
  const current = getAppLanguage(user);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = async (code) => {
    if (code === current) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({ language: code });
      await checkUserAuth();
    } catch (e) {
      /* non-fatal */
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  const currentLang = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="flex items-center gap-1.5 h-8 px-2 rounded-md hover:bg-muted transition-colors text-sm text-foreground"
        aria-label="Language"
      >
        <Globe className="w-4 h-4" />
        <span className="font-semibold text-xs">{currentLang.short}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-border rounded-lg shadow-lg z-50 animate-fade-in py-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => select(l.code)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left",
                l.code === current ? "text-primary font-medium" : "text-foreground"
              )}
            >
              <span>{l.label}</span>
              {l.code === current && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}