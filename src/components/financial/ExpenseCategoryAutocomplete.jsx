import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDropUp } from "@/hooks/useDropUp";
import { Search, Plus, Check } from "lucide-react";

export default function ExpenseCategoryAutocomplete({
  value,
  onChange,
  suggestions = [],
  placeholder = "Type a category name…",
}) {
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const dropUp = useDropUp(wrapperRef, focused);
  // Set while a suggestion is being picked: blur() below fires before this render's state
  // lands, and handleBlur would otherwise re-save the half-typed letter over the pick.
  const justSelectedRef = useRef(false);
  // The last value that was really chosen (picked, added, or given by the parent). Leaving the
  // box empty or with a half-typed fragment puts this back instead of saving one letter.
  const committedRef = useRef(value || "");

  useEffect(() => {
    // Don't overwrite what's being typed when the parent just echoes back the trimmed text.
    setInputValue((cur) => {
      if ((cur || "").trim() === (value || "")) return cur;
      committedRef.current = value || "";
      return value || "";
    });
  }, [value]);

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
      const n = (s || "").trim();
      const key = n.toLowerCase();
      if (n && !seen.has(key)) {
        seen.add(key);
        result.push(n);
      }
    }
    return result.sort((a, b) => a.localeCompare(b));
  }, [suggestions]);

  const normalizedInput = (inputValue || "").trim();
  const filtered = dedupedSuggestions.filter((s) =>
    s.toLowerCase().includes(normalizedInput.toLowerCase())
  );
  const exactMatch = dedupedSuggestions.some(
    (s) => s.toLowerCase() === normalizedInput.toLowerCase()
  );
  const showAddOption = normalizedInput.length > 0 && !exactMatch;

  const selectValue = (val) => {
    justSelectedRef.current = true;
    committedRef.current = val;
    setInputValue(val);
    onChange(val);
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val.trim());
    if (!focused) setFocused(true);
  };

  const handleBlur = () => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
    } else {
      const lower = normalizedInput.toLowerCase();
      const exact = dedupedSuggestions.find((s) => s.toLowerCase() === lower);
      const isFragment = !exact && filtered.length > 0;
      let next;
      if (exact) next = exact;
      else if (!normalizedInput || isFragment) next = committedRef.current;
      else next = normalizedInput; // a genuinely new name: keep it
      committedRef.current = next;
      setInputValue(next);
      onChange(next);
    }
    setTimeout(() => setFocused(false), 150);
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
          placeholder={placeholder}
          autoComplete="off"
          className="w-full h-9 pl-9 pr-3 text-base md:text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40"
        />
      </div>
      {focused && (dedupedSuggestions.length > 0 || showAddOption) && (
        <div className={cn("absolute z-50 left-0 right-0", dropUp ? "bottom-full mb-1" : "top-full mt-1")} ><div className="bg-card border border-border rounded-lg shadow-lg max-h-[200px] overflow-y-auto scrollbar-thin">
          {showAddOption && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectValue(normalizedInput);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-primary/5 border-b border-border sticky top-0 bg-card"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>
                Add <span className="font-semibold">"{normalizedInput}"</span>
              </span>
            </button>
          )}
          {filtered.map((s) => {
            const isSelected = s.toLowerCase() === normalizedInput.toLowerCase();
            return (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectValue(s);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                  isSelected ? "text-primary font-medium" : "text-foreground"
                )}
              >
                <span>{s}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && !showAddOption && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matching categories
            </div>
          )}
        </div></div>
      )}
    </div>
  );
}
