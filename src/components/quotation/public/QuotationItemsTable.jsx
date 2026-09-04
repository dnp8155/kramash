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

// Itemized mode — full table with qty, rate, amount
function ItemizedTable({ items, currency }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
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
          {items.map((it, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-3">
                <div className="font-medium text-foreground">{it.name}</div>
                {it.description && <div className="text-xs text-muted-foreground mt-0.5">{it.description}</div>}
                {it.phase_title && (
                  <div className="text-xs text-muted-foreground mt-0.5 italic">{it.phase_title}{it.day_date ? ` · ${dateShort(it.day_date)}` : ""}</div>
                )}
                {it.team_member_name_snapshot && (
                  <div className="text-xs text-muted-foreground mt-0.5">— {it.team_member_name_snapshot}{it.member_type ? ` (${it.member_type})` : ""}</div>
                )}
              </td>
              <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">
                {it.quantity}{it.rate_type === "Per Day" && it.days ? ` × ${it.days}d` : ""}
              </td>
              <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">{money(it.unit_rate, currency)}</td>
              <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">{money(it.line_total, currency)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No items</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Package / lump-sum mode — hide pricing, show scope/deliverables grouped by day
function PackageView({ items }) {
  // Group by day_date (or phase_title), then list included items
  const groups = {};
  const ungrouped = [];
  for (const it of items) {
    const key = it.day_date || it.phase_title || "";
    if (key) {
      if (!groups[key]) groups[key] = { date: it.day_date, phase: it.phase_title, items: [] };
      groups[key].items.push(it);
    } else {
      ungrouped.push(it);
    }
  }
  const groupKeys = Object.keys(groups).sort();

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
              {g.items.map((it, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
                  <span>
                    <span className="text-foreground font-medium">{it.name}</span>
                    {it.team_member_name_snapshot && <span> — {it.team_member_name_snapshot}</span>}
                    {it.description && <span className="block text-xs text-muted-foreground mt-0.5">{it.description}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {ungrouped.length > 0 && (
        <div className="px-4 py-3.5">
          {groupKeys.length === 0 && <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Included Scope</div>}
          <ul className="space-y-1">
            {ungrouped.map((it, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
                <span>
                  <span className="text-foreground font-medium">{it.name}</span>
                  {it.team_member_name_snapshot && <span> — {it.team_member_name_snapshot}</span>}
                  {it.description && <span className="block text-xs text-muted-foreground mt-0.5">{it.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {items.length === 0 && (
        <div className="px-4 py-6 text-center text-muted-foreground text-sm">No items</div>
      )}
    </div>
  );
}

export default function QuotationItemsTable({ items, showPricing, currency }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Scope of Work</h2>
      </div>
      {showPricing
        ? <ItemizedTable items={items} currency={currency} />
        : <PackageView items={items} />
      }
    </div>
  );
}