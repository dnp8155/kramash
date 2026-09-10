import { useState, useRef, useMemo, useEffect } from "react";
import { ChevronDown, Plus, User } from "lucide-react";
import SelfBadge from "@/components/common/SelfBadge";
import { isSelfMember } from "@/utils/selfDetection";

// Autocomplete/suggestion input for Service Provider selection.
//
// Shows existing workspace Team Members + the event's Client as suggestions.
// Allows typing a custom provider name — when no exact match exists, an
// "Add new provider" option appears. The parent modal creates a TeamMember
// record for custom providers on save, so they appear in future suggestions.
//
// Deduplication is case-insensitive and trimmed — "Patel Sound & Light",
// "patel sound & light", and "PATEL SOUND & LIGHT" all resolve to the same
// existing member.
//
// Resolution object passed to onChange:
//   { providerId: string | null, providerName: string, isCustom: boolean }
//   - Client:  { providerId: "client", providerName: clientName, isCustom: false }
//   - Member:  { providerId: memberId, providerName: memberName, isCustom: false }
//   - Custom:  { providerId: null, providerName: typedName, isCustom: true }
//   - Empty:   { providerId: null, providerName: "", isCustom: false }
//
// Mobile-safe: 16px font-size (global rule), max-h dropdown, z-50 stacking.
export default function ServiceProviderAutocomplete({
  label,
  value,
  onChange,
  members = [],
  client = null,
  ownerName = "",
  selfAlreadyAssigned = false,
  isEditing = false,
  editingProviderId = null,
  placeholder = "Select or type a provider name…",
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.providerName || "");
  const containerRef = useRef(null);

  // Sync input when external value changes (e.g. opening edit for a different assignment)
  useEffect(() => {
    setInputValue(value?.providerName || "");
  }, [value?.providerName]);

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

  // Build suggestion list: Client first (if exists), then active team members.
  // SELF is filtered out if already assigned to this event (add mode only).
  // In edit mode, the current assignment's SELF provider stays visible.
  const suggestions = useMemo(() => {
    const list = [];
    if (client) {
      list.push({
        key: "client",
        label: `Client — ${client.name}`,
        providerId: "client",
        providerName: client.name,
        isCustom: false,
        isSelf: false,
      });
    }
    for (const m of members) {
      if (m.status !== "Active") continue;
      const self = isSelfMember(m.name, ownerName);
      if (
        self &&
        selfAlreadyAssigned &&
        !(isEditing && editingProviderId === m.id)
      )
        continue;
      list.push({
        key: m.id,
        label: m.name + (m.profession ? ` — ${m.profession}` : ""),
        providerId: m.id,
        providerName: m.name,
        isCustom: false,
        isSelf: self,
      });
    }
    return list;
  }, [members, client, ownerName, selfAlreadyAssigned, isEditing, editingProviderId]);

  // Filter suggestions by input text (case-insensitive includes match)
  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((s) => s.label.toLowerCase().includes(q));
  }, [inputValue, suggestions]);

  // Check if input exactly matches an existing suggestion's name (case-insensitive)
  const exactMatch = useMemo(
    () =>
      suggestions.find(
        (s) =>
          s.providerName.trim().toLowerCase() ===
          inputValue.trim().toLowerCase()
      ),
    [inputValue, suggestions]
  );

  const showAddOption = inputValue.trim() && !exactMatch;

  const selectSuggestion = (s) => {
    setInputValue(s.providerName);
    onChange(s);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    const match = suggestions.find(
      (s) =>
        s.providerName.trim().toLowerCase() === val.trim().toLowerCase()
    );
    if (match) {
      onChange(match);
    } else if (val.trim()) {
      onChange({ providerId: null, providerName: val.trim(), isCustom: true });
    } else {
      onChange({ providerId: null, providerName: "", isCustom: false });
    }
    setOpen(true);
  };

  const handleBlur = () => {
    // If typed text matches an existing suggestion, snap to the canonical casing
    if (exactMatch && exactMatch.providerName !== inputValue) {
      setInputValue(exactMatch.providerName);
      onChange(exactMatch);
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
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg ks-scrollbar">
            {filtered.map((s) => (
              <button
                key={s.key}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                  value?.providerId === s.providerId
                    ? "bg-primary/5 font-medium text-primary"
                    : "text-foreground"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {s.providerId === "client" && (
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{s.label}</span>
                </span>
                {s.isSelf && <SelfBadge />}
              </button>
            ))}
            {showAddOption && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const customName = inputValue.trim();
                  setInputValue(customName);
                  onChange({
                    providerId: null,
                    providerName: customName,
                    isCustom: true,
                  });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-primary/5"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  Add new provider: &ldquo;{inputValue.trim()}&rdquo;
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}