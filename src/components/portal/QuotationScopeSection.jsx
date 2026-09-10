import { Package } from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/format";

function ItemTable({ items, startIndex = 0 }) {
  return (
    <div className="hidden sm:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="py-2 pr-2 text-left font-medium">#</th>
            <th className="py-2 pr-2 text-left font-medium">Description</th>
            <th className="py-2 px-2 text-right font-medium">Qty</th>
            <th className="py-2 px-2 text-right font-medium">Rate</th>
            <th className="py-2 pl-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-border/30">
              <td className="py-2.5 pr-2 text-muted-foreground">{startIndex + idx + 1}</td>
              <td className="py-2.5 pr-2">
                <p className="font-medium text-foreground">{item.name}</p>
                {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                {item.member_side && (
                  <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {item.member_side}
                  </span>
                )}
              </td>
              <td className="py-2.5 px-2 text-right text-muted-foreground">{item.quantity || 1}</td>
              <td className="py-2.5 px-2 text-right text-muted-foreground">{formatCurrency(item.unit_rate || 0)}</td>
              <td className="py-2.5 pl-2 text-right font-semibold text-foreground">{formatCurrency(item.line_total || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemCards({ items, startIndex = 0 }) {
  return (
    <div className="space-y-2 sm:hidden">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              <span className="mr-1.5 text-xs text-muted-foreground">{startIndex + idx + 1}.</span>
              {item.name}
            </p>
            <p className="shrink-0 text-sm font-semibold text-foreground">{formatCurrency(item.line_total || 0)}</p>
          </div>
          {item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{item.quantity || 1} × {formatCurrency(item.unit_rate || 0)}</span>
            {item.member_side && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{item.member_side}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QuotationScopeSection({ quotation, items }) {
  const isPackage = quotation.is_package === true;
  const showPricing = quotation.show_item_pricing !== false;

  // Group items by day/phase
  const itemsByDay = {};
  const ungroupedItems = [];
  (items || []).forEach((item) => {
    if (item.day_date) {
      const key = `${item.day_date}|||${item.phase_title || ""}`;
      if (!itemsByDay[key]) itemsByDay[key] = [];
      itemsByDay[key].push(item);
    } else {
      ungroupedItems.push(item);
    }
  });
  const dayKeys = Object.keys(itemsByDay).sort();
  const hasItems = items && items.length > 0;

  if (!hasItems) return null;

  const renderItems = (dayItems, startIndex) => {
    if (isPackage) {
      return (
        <div className="divide-y divide-border/50">
          {dayItems.map((item, idx) => (
            <div key={idx} className="py-2.5">
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              {item.member_side && (
                <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {item.member_side}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (showPricing) {
      return (
        <>
          <ItemTable items={dayItems} startIndex={startIndex} />
          <ItemCards items={dayItems} startIndex={startIndex} />
        </>
      );
    }
    return (
      <div className="divide-y divide-border/50">
        {dayItems.map((item, idx) => (
          <div key={idx} className="flex items-start py-2.5">
            <span className="mr-3 text-xs text-muted-foreground">{startIndex + idx + 1}.</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              {item.member_side && (
                <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {item.member_side}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  let runningIndex = 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        {isPackage ? <Package className="h-4 w-4 text-primary" /> : null}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {isPackage ? (quotation.package_name || "Package Scope") : "Scope of Work"}
        </h3>
      </div>

      {isPackage && quotation.package_inclusions && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{quotation.package_inclusions}</p>
      )}

      <div className="mt-4 space-y-4">
        {dayKeys.map((key) => {
          const [date, phaseTitle] = key.split("|||");
          const dayItems = itemsByDay[key];
          const section = (
            <div key={key}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {formatDate(date)}
                </span>
                {phaseTitle && <span className="text-sm font-semibold text-foreground">{phaseTitle}</span>}
              </div>
              {renderItems(dayItems, runningIndex)}
            </div>
          );
          runningIndex += dayItems.length;
          return section;
        })}

        {ungroupedItems.length > 0 && (
          <div>
            {dayKeys.length > 0 && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Other Items</p>
            )}
            {renderItems(ungroupedItems, runningIndex)}
          </div>
        )}
      </div>
    </div>
  );
}