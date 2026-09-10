import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { normalizeEventType } from "@/lib/eventTypeService";
import { Search, Plus, Check } from "lucide-react";

// Autocomplete/suggestion input for Event Type.
// - Shows workspace event types as suggestions on focus
// - Filters as the user types
// - Allows custom values (not in the suggestion list)
// - Mobile-friendly: 16px font, scrollable dropdown, no viewport overflow
export default function EventTypeAutocomplete({
  value,
  onChange,
  suggestions = [],
  placeholder = "Type or select…",
}) {
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Sync local input when the external value changes (form reset / edit prefill)
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Deduplicate + sort suggestions (case-insensitive)
  const dedupedSuggestions = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const s of suggestions) {
      const n = normalizeEventType(s);
      const key = n.toLowerCase();
      if (n && !seen.has(key)) {
        seen.add(key);
        result.push(n);
      }
    }
    return result.sort((a, b) => a.localeCompare(b));
  }, [suggestions]);

  const normalizedInput = normalizeEventType(inputValue);
  const filtered = dedupedSuggestions.filter((s) =>
    s.toLowerCase().includes(normalizedInput.toLowerCase())
  );
  const exactMatch = dedupedSuggestions.some(
    (s) => s.toLowerCase() === normalizedInput.toLowerCase()
  );
  const showAddOption = normalizedInput.length > 0 && !exactMatch;

  const selectValue = (val) => {
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
    // Commit the typed value (allows custom values that aren't in the list)
    onChange(normalizedInput);
    // Delay closing so suggestion clicks register
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
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-[200px] overflow-y-auto scrollbar-thin">
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
              No matching types
            </div>
          )}
        </div>
      )}
    </div>
  );
}