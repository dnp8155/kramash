import { useState, useRef, useMemo, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";

// Autocomplete/suggestion input for Event Type.
// Shows workspace-configured + previously used types as suggestions.
// Allows typing custom values — new values are auto-added to the workspace
// by EventForm after save. Deduplication is case-insensitive.
//
// Mobile-safe: the global 16px font-size rule prevents iOS auto-zoom.
// The dropdown is absolutely positioned with max-h to avoid viewport overflow.
export default function EventTypeAutocomplete({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder = "Select or type a new type…",
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const containerRef = useRef(null);

  // Sync input when external value changes (e.g. opening edit for a different event)
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Deduplicate suggestions (case-insensitive), preserving first-seen casing
  const normalizedSuggestions = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const s of suggestions) {
      const key = (s || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(s.trim());
      }
    }
    return result;
  }, [suggestions]);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return normalizedSuggestions;
    return normalizedSuggestions.filter((s) => s.toLowerCase().includes(q));
  }, [inputValue, normalizedSuggestions]);

  const exactMatch = useMemo(
    () =>
      normalizedSuggestions.some(
        (s) => s.toLowerCase() === inputValue.trim().toLowerCase()
      ),
    [inputValue, normalizedSuggestions]
  );

  const showAddOption = inputValue.trim() && !exactMatch;

  const selectValue = (val) => {
    setInputValue(val);
    onChange(val);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const handleBlur = () => {
    // If the typed value matches an existing suggestion (case-insensitive),
    // replace with the properly-cased version to avoid duplicates.
    const match = normalizedSuggestions.find(
      (s) => s.toLowerCase() === inputValue.trim().toLowerCase()
    );
    if (match && match !== inputValue) {
      setInputValue(match);
      onChange(match);
    }
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          className="h-10 w-full rounded-lg border border-input bg-card px-3 pr-9 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {open && (filtered.length > 0 || showAddOption) && (
          <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectValue(s);
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                  s.toLowerCase() === inputValue.trim().toLowerCase()
                    ? "bg-primary/5 font-medium text-primary"
                    : "text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
            {showAddOption && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectValue(inputValue.trim());
                }}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-primary/5"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  Use: &ldquo;{inputValue.trim()}&rdquo;
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}