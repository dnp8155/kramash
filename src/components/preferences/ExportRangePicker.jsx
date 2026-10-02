import { useEffect, useMemo, useState } from "react";
import Select from "@/components/common/Select";
import Input from "@/components/common/Input";
import { fyRangeLabel } from "@/lib/exportUtils";
import { formatDate } from "@/lib/dates";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Range chooser for Data Export — same options as Data Deletion, plus "All time".
// Reports { type, start, end, label, fy } (or null while incomplete/invalid) through onChange.
export default function ExportRangePicker({ fiscalYears = [], defaultFyId = "", onChange }) {
  const [rangeType, setRangeType] = useState("fy");
  const [fyId, setFyId] = useState(defaultFyId || "");
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Pick up the default FY once the list loads.
  useEffect(() => {
    if (!fyId && (defaultFyId || fiscalYears[0]?.id)) setFyId(defaultFyId || fiscalYears[0].id);
  }, [defaultFyId, fiscalYears, fyId]);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return [now - 4, now - 3, now - 2, now - 1, now, now + 1];
  }, []);

  const range = useMemo(() => {
    if (rangeType === "all") return { type: "all", label: "All Time" };
    if (rangeType === "fy") {
      const fy = fiscalYears.find((f) => f.id === fyId);
      return fy ? { type: "fy", start: fy.start_date, end: fy.end_date, label: fyRangeLabel(fy), fy } : null;
    }
    if (rangeType === "month") {
      const mm = String(month + 1).padStart(2, "0");
      const last = new Date(year, month + 1, 0).getDate();
      return { type: "month", start: `${year}-${mm}-01`, end: `${year}-${mm}-${last}`, label: `${MONTHS[month]} ${year}` };
    }
    if (rangeType === "year") return { type: "year", start: `${year}-01-01`, end: `${year}-12-31`, label: `Year ${year}` };
    if (!customStart || !customEnd || customStart > customEnd) return null;
    return { type: "custom", start: customStart, end: customEnd, label: `${formatDate(customStart)} - ${formatDate(customEnd)}` };
  }, [rangeType, fiscalYears, fyId, month, year, customStart, customEnd]);

  useEffect(() => { onChange(range); }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3 mb-3">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Export range</label>
        <Select value={rangeType} onChange={(e) => setRangeType(e.target.value)} className="w-full">
          <option value="fy">By Financial Year</option>
          <option value="month">By Month</option>
          <option value="year">By Year</option>
          <option value="custom">Custom Range</option>
          <option value="all">All Time</option>
        </Select>
      </div>

      {rangeType === "fy" && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Financial Year</label>
          <Select value={fyId} onChange={(e) => setFyId(e.target.value)} className="w-full">
            {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </Select>
        </div>
      )}

      {rangeType === "month" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Month</label>
            <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full">
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Year</label>
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        </div>
      )}

      {rangeType === "year" && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Year</label>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
      )}

      {rangeType === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">From Date</label>
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">To Date</label>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
        {range ? <>Range: <span className="font-medium text-foreground">{range.label}</span></> : "Choose a valid range (the end date can't be before the start)."}
      </div>
    </div>
  );
}
