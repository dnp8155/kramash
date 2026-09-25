import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";

function money(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return `${sym}${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function dateShort(d) {
  if (!d) return "";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); }
  catch { return d; }
}

// When "Hide Team Names" is on, collapse team items to their role and service
// items to their name — merging identical rows into a "N × Label" count
// instead of listing each individually-assigned person/line.
function groupForHiddenNames(items) {
  const groups = [];
  const index = new Map();
  for (const it of items) {
    if (it.item_type !== "team" && it.item_type !== "service") {
      groups.push(it);
      continue;
    }
    const label = it.item_type === "team" ? (it.description || "Team Member") : (it.name || "Service");
    const key = `${it.item_type}:${label}:${it.unit_rate}:${it.rate_type}`;
    if (index.has(key)) {
      const g = groups[index.get(key)];
      g._count = (g._count || 1) + 1;
      g.quantity = (Number(g.quantity) || 0) + (Number(it.quantity) || 0);
      g.line_total = (Number(g.line_total) || 0) + (Number(it.line_total) || 0);
    } else {
      index.set(key, groups.length);
      groups.push({ ...it, _count: 1 });
    }
  }
  return groups;
}

// Resolve the bold/primary label and the muted/secondary line for an item.
// Team items show Role first, team member name below it (not the other way
// around); under "Hide Team Names" both team and service items collapse to
// a generic "N × Label" with no secondary line.
function displayFields(it, hideTeamNames) {
  if (hideTeamNames && (it.item_type === "team" || it.item_type === "service")) {
    const label = it.item_type === "team" ? (it.description || it.name || "Team Member") : (it.name || "Service");
    const count = it._count || 1;
    return { primary: `${count} × ${label}`, secondary: "" };
  }
  if (it.item_type === "team") {
    const role = it.description || "Team Member";
    const member = it.team_member_name_snapshot || it.name || "";
    return { primary: role, secondary: member ? `${member}${it.member_type ? ` (${it.member_type})` : ""}` : "" };
  }
  return { primary: it.name || "Unnamed", secondary: it.description || "" };
}

function ItemizedTable({ items, currency, hideTeamNames }) {
  if (items.length === 0) {
    return <div className="px-4 py-6 text-center text-muted-foreground text-sm">No items</div>;
  }
  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium w-8">#</th>
              <th className="px-3 py-2.5 font-medium">Description</th>
              <th className="px-3 py-2.5 font-medium text-right">Qty</th>
              <th className="px-3 py-2.5 font-medium text-right">Rate</th>
              <th className="px-4 py-2.5 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const { primary, secondary } = displayFields(it, hideTeamNames);
              return (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-foreground">{primary}</div>
                    {secondary && <div className="text-xs text-muted-foreground mt-0.5">{secondary}</div>}
                    {it.phase_title && (
                      <div className="text-xs text-muted-foreground mt-0.5 italic">{it.phase_title}{it.day_date ? ` · ${dateShort(it.day_date)}` : ""}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">
                    {it.quantity}{it.rate_type === "Per Day" && it.days ? ` × ${it.days}d` : ""}
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">{money(it.unit_rate, currency)}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">{money(it.line_total, currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden divide-y divide-border">
        {items.map((it, i) => {
          const { primary, secondary } = displayFields(it, hideTeamNames);
          return (
            <div key={i} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-xs text-muted-foreground">{i + 1}</div>
                <div className="text-sm font-semibold text-foreground ml-auto text-right whitespace-nowrap">{money(it.line_total, currency)}</div>
              </div>
              <div className="font-medium text-foreground">{primary}</div>
              {secondary && <div className="text-xs text-muted-foreground mt-0.5">{secondary}</div>}
              {it.phase_title && (
                <div className="text-xs text-muted-foreground mt-0.5 italic">{it.phase_title}{it.day_date ? ` · ${dateShort(it.day_date)}` : ""}</div>
              )}
              <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                <span>Qty: <span className="font-medium text-foreground">{it.quantity}{it.rate_type === "Per Day" && it.days ? ` × ${it.days}d` : ""}</span></span>
                <span>Rate: <span className="font-medium text-foreground">{money(it.unit_rate, currency)}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PackageView({ items, hideTeamNames }) {
  const groups = {};
  const ungrouped = [];
  items.forEach((it) => {
    const key = it.day_date || it.phase_title || "";
    if (key) {
      if (!groups[key]) groups[key] = { phase: it.phase_title || "", date: it.day_date || "", items: [] };
      groups[key].items.push(it);
    } else {
      ungrouped.push(it);
    }
  });
  const groupKeys = Object.keys(groups);

  const renderRow = (it, i) => {
    const { primary, secondary } = displayFields(it, hideTeamNames);
    return (
      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
        <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
        <span>
          <span className="text-foreground font-medium">{primary}</span>
          {secondary && <span className="block text-xs text-muted-foreground mt-0.5">{secondary}</span>}
        </span>
      </li>
    );
  };

  return (
    <div className="divide-y divide-border">
      {groupKeys.map((key) => {
        const g = groups[key];
        return (
          <div key={key} className="px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              {g.phase && <span className="text-sm font-semibold text-foreground">{g.phase}</span>}
              {g.date && <span className="text-xs text-muted-foreground">· {dateShort(g.date)}</span>}
            </div>
            <ul className="space-y-1">
              {g.items.map(renderRow)}
            </ul>
          </div>
        );
      })}
      {ungrouped.length > 0 && (
        <div className="px-4 py-3.5">
          {groupKeys.length === 0 && <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Included Scope</div>}
          <ul className="space-y-1">
            {ungrouped.map(renderRow)}
          </ul>
        </div>
      )}
      {items.length === 0 && <div className="px-4 py-6 text-center text-muted-foreground text-sm">No items</div>}
    </div>
  );
}

export default function QuotationItemsTable({ items, showPricing, currency, hideTeamNames }) {
  const displayItems = hideTeamNames ? groupForHiddenNames(items) : items;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Scope of Work</h2>
      </div>
      {showPricing ? (
        <ItemizedTable items={displayItems} currency={currency} hideTeamNames={hideTeamNames} />
      ) : (
        <PackageView items={displayItems} hideTeamNames={hideTeamNames} />
      )}
    </div>
  );
}
