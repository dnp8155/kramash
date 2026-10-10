import { formatMoney } from "@/utils/format";
import { formatDateChip } from "@/lib/dates";
import { groupForHiddenNames } from "@/lib/quotationClientView";
import { getMemberTypeColor } from "@/lib/memberTypeService";
import { isIncludeItem } from "@/lib/quotationCalc";

function money(n, currency) {
  return formatMoney(n, currency);
}

function dateShort(d) {
  if (!d) return "";
  return formatDateChip(d);
}

// Resolve the bold/primary label and the muted/secondary line for an item.
// Team items show Role first, team member name below it (not the other way
// around); under "Hide Team Names" both team and service items collapse to
// a generic "N × Label" with no secondary line.
// The side a team member is booked for (Bride Side, Groom Side…).
// Same colour tag as the app's team lists: the colour comes from the business's own member-type setup
// (saved on the quotation's business snapshot); no colour set -> plain bold text, exactly like MemberTypeTag.
function SideTag({ side, business }) {
  if (!side) return null;
  const color = getMemberTypeColor(business, side);
  return color ? (
    <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold align-middle whitespace-nowrap" style={{ backgroundColor: color + "20", color }}>{side}</span>
  ) : (
    <span className="ml-1.5 text-[10px] font-semibold text-foreground align-middle whitespace-nowrap">{side}</span>
  );
}

// "Add-on" marker for optional extras — same wording the event details page uses.
function AddonTag({ show }) {
  if (!show) return null;
  return <span className="ml-1.5 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning whitespace-nowrap">Add-on</span>;
}

// Includes / Deliverables: their own block under the day-wise scope — quantity × rate = amount when pricing is on.
function IncludesBlock({ items, showPricing, currency }) {
  if (!items.length) return null;
  return (
    <div className="border-t border-border">
      <div className="px-5 py-3 bg-muted/30"><h3 className="text-sm font-semibold text-foreground">Includes</h3></div>
      {showPricing ? (
        <div className="divide-y divide-border">
          {items.map((it, i) => (
            <div key={i} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-foreground text-sm">{it.name || "Item"}<AddonTag show={it.is_addon} /></div>
                {it.description && <div className="text-xs text-muted-foreground mt-0.5">{it.description}</div>}
                {Number(it.quantity) !== 1 && <div className="text-xs text-muted-foreground mt-0.5">{it.quantity} × {money(it.unit_rate, currency)}</div>}
              </div>
              <div className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">{money(it.line_total, currency)}</div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="px-5 py-3 space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
              <span><span className="text-foreground font-medium">{Number(it.quantity) > 1 ? `${it.quantity} × ` : ""}{it.name || "Item"}</span><AddonTag show={it.is_addon} />
                {it.description && <span className="block text-xs text-muted-foreground mt-0.5">{it.description}</span>}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function displayFields(it, hideTeamNames) {
  if (hideTeamNames && (it.item_type === "team" || it.item_type === "service")) {
    const label = it.item_type === "team" ? (it.description || "Team Member") : (it.name || "Service");
    const count = it._count || 1;
    return { primary: `${count} × ${label}`, secondary: "", side: it._side || "" };
  }
  if (it.item_type === "team") {
    const role = it.description || "Team Member";
    const member = it.team_member_name_snapshot || (it.name && it.name !== role ? it.name : "");
    return { primary: role, secondary: member, side: it.member_type || "" };
  }
  return { primary: it.name || "Unnamed", secondary: it.description || "", side: "" };
}

function ItemizedTable({ items, currency, hideTeamNames, business }) {
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
              const { primary, secondary, side } = displayFields(it, hideTeamNames);
              return (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-foreground">{primary}<SideTag side={side} business={business} /><AddonTag show={it.is_addon} /></div>
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
          const { primary, secondary, side } = displayFields(it, hideTeamNames);
          return (
            <div key={i} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-xs text-muted-foreground">{i + 1}</div>
                <div className="text-sm font-semibold text-foreground ml-auto text-right whitespace-nowrap">{money(it.line_total, currency)}</div>
              </div>
              <div className="font-medium text-foreground">{primary}<SideTag side={side} business={business} /><AddonTag show={it.is_addon} /></div>
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

function PackageView({ items, hideTeamNames, business }) {
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
  // Dated days run in calendar order (a day added later must not land at the bottom);
  // groups without a date keep their original order after them.
  const groupKeys = Object.keys(groups).sort((a, b) => {
    const da = groups[a].date;
    const db = groups[b].date;
    if (da && db) return da.localeCompare(db);
    if (da) return -1;
    if (db) return 1;
    return 0;
  });

  const renderRow = (it, i) => {
    const { primary, secondary, side } = displayFields(it, hideTeamNames);
    return (
      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
        <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
        <span>
          <span className="text-foreground font-medium">{primary}<SideTag side={side} business={business} /><AddonTag show={it.is_addon} /></span>
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

export default function QuotationItemsTable({ items, showPricing, currency, hideTeamNames, business }) {
  const allItems = hideTeamNames ? groupForHiddenNames(items) : items;
  // Dated rows run in calendar order in both views; undated rows keep their order after them (stable sort).
  const displayItems = allItems.filter((it) => !isIncludeItem(it)).sort((x, y) => {
    if (x.day_date && y.day_date) return x.day_date.localeCompare(y.day_date);
    return x.day_date ? -1 : y.day_date ? 1 : 0;
  });
  const includeItems = allItems.filter(isIncludeItem);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Scope of Work</h2>
      </div>
      {showPricing ? (
        <ItemizedTable items={displayItems} currency={currency} hideTeamNames={hideTeamNames} business={business} />
      ) : (
        <PackageView items={displayItems} hideTeamNames={hideTeamNames} business={business} />
      )}
      <IncludesBlock items={includeItems} showPricing={showPricing} currency={currency} />
    </div>
  );
}
