import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDropUp } from "@/hooks/useDropUp";
import { normalizeProviderName } from "@/lib/serviceProviderService";
import { Search, Plus, Check, Crown } from "lucide-react";
import { useT } from "@/hooks/useT";

export default function ServiceProviderAutocomplete({
  value,
  onChange,
  suggestions = [],
  placeholder,
  disabled = false,
}) {
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value?.name || "");
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const dropUp = useDropUp(wrapperRef, focused);
  // blur() inside a pick fires before the new text lands; skip the stale re-save it would do.
  const justSelectedRef = useRef(false);
  // Last really chosen provider; leaving the box half-typed puts it back.
  const committedRef = useRef(value || { id: "", name: "", type: "custom" });
  const typedRef = useRef(null);

  useEffect(() => {
    setInputValue(value?.name || "");
    if ((value?.name || "") !== typedRef.current) committedRef.current = value || { id: "", name: "", type: "custom" };
  }, [value?.name]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dedupedSuggestions = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const s of suggestions) {
      const n = normalizeProviderName(s.name);
      const key = n.toLowerCase();
      if (n && !seen.has(key)) {
        seen.add(key);
        result.push({ ...s, name: n });
      }
    }
    return result;
  }, [suggestions]);

  const normalizedInput = normalizeProviderName(inputValue);
  const filtered = dedupedSuggestions.filter((s) =>
    s.name.toLowerCase().includes(normalizedInput.toLowerCase())
  );
  const exactMatch = dedupedSuggestions.some(
    (s) => s.name.toLowerCase() === normalizedInput.toLowerCase()
  );
  const showAddOption = normalizedInput.length > 0 && !exactMatch;

  const selectSuggestion = (s) => {
    justSelectedRef.current = true;
    const picked = { id: s.type === "member" ? s.id : "", name: s.name, type: s.type };
    committedRef.current = picked;
    setInputValue(s.name);
    onChange(picked);
    setFocused(false);
    inputRef.current?.blur();
  };

  const selectCustom = () => {
    const name = normalizeProviderName(inputValue);
    justSelectedRef.current = true;
    committedRef.current = { id: "", name, type: "custom" };
    setInputValue(name);
    onChange({ id: "", name, type: "custom" });
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    const name = normalizeProviderName(val);
    typedRef.current = name;
    const match = dedupedSuggestions.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (match) {
      onChange({ id: match.type === "member" ? match.id : "", name, type: match.type });
    } else {
      onChange({ id: "", name, type: "custom" });
    }
    if (!focused) setFocused(true);
  };

  const handleBlur = () => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      setTimeout(() => setFocused(false), 150);
      return;
    }
    const name = normalizeProviderName(inputValue);
    const match = dedupedSuggestions.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    let next;
    if (match) next = { id: match.type === "member" ? match.id : "", name: match.name, type: match.type };
    else if (name && filtered.length === 0) next = { id: "", name, type: "custom" };
    else if (name) next = committedRef.current; // half-typed fragment of an existing name
    if (next) {
      committedRef.current = next;
      setInputValue(next.name || "");
      onChange(next);
    }
    setTimeout(() => setFocused(false), 150);
  };

  const clearValue = () => {
    committedRef.current = { id: "", name: "", type: "custom" };
    setInputValue("");
    onChange({ id: "", name: "", type: "custom" });
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder ?? t("Type or select a provider…")}
          autoComplete="off"
          disabled={disabled}
          className="w-full h-9 pl-9 pr-9 text-base md:text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {inputValue && !disabled && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); clearValue(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            aria-label={t("Clear")}
          >
            ✕
          </button>
        )}
      </div>
      {focused && !disabled && (dedupedSuggestions.length > 0 || showAddOption) && (
        <div className={cn("absolute z-50 left-0 right-0", dropUp ? "bottom-full mb-1" : "top-full mt-1")} ><div className="bg-card border border-border rounded-lg shadow-lg max-h-[240px] overflow-y-auto scrollbar-thin">
          {showAddOption && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectCustom(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-primary/5 border-b border-border sticky top-0 bg-card"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>
                {t("Add new provider:")} <span className="font-semibold">"{normalizedInput}"</span>
              </span>
            </button>
          )}
          {filtered.map((s) => {
            const isSelected = s.name.toLowerCase() === normalizedInput.toLowerCase();
            return (
              <button
                key={s.type + "-" + s.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                  isSelected ? "text-primary font-medium" : "text-foreground"
                )}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {s.isSelf && <Crown className="w-3.5 h-3.5 text-primary shrink-0" />}
                  <span className="truncate">{s.name}</span>
                  {s.isSelf && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary shrink-0">{t("Self")}</span>
                  )}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && !showAddOption && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {t("No matching providers")}
            </div>
          )}
        </div></div>
      )}
    </div>
  );
}
