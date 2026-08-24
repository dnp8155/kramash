import { useState } from "react";
import { deliverables } from "@/data/mockPreferences";
import { formatINR } from "@/utils/format";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import Toggle from "@/components/common/Toggle";
import { FileText, Info, RefreshCw, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Quotation() {
  const [terms, setTerms] = useState("This quotation is valid for 30 days. Payment Terms: 50% Advance.");
  const [quotationNo, setQuotationNo] = useState("");
  const [date, setDate] = useState("2026-08-24");
  const [client, setClient] = useState({ name: "", contact: "", email: "", residence: "", venue: "" });
  const [eventDates, setEventDates] = useState({ start: "2026-08-24", end: "2026-08-24" });
  const [eventDays, setEventDays] = useState(["24 Aug 2026"]);
  const [included, setIncluded] = useState(deliverables.slice(0, 4));
  const [total, setTotal] = useState("");
  const [includeTerms, setIncludeTerms] = useState(true);

  const toggleDeliverable = (d) =>
    setIncluded((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          Build a client quotation and a team job sheet from one form — for event managers, photographers,
          architects and anyone running jobs with a crew. Roles & rates come from your Preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4">
          {/* Terms */}
          <Section icon={FileText} title="Terms & Conditions" hint="shown on the PDF">
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
              className="w-full bg-card border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Your logo, name, company & contact come from Preferences — they appear on the PDF
              automatically. Your profile photo is used as the logo.
            </p>
          </Section>

          {/* Quotation */}
          <Section title="Quotation">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Quotation No">
                <Input value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)} placeholder="e.g. Q-2026-01" />
              </Field>
              <Field label="Date">
                <div className="flex gap-2">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
                  <Button variant="outline" size="md" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>
                    Today
                  </Button>
                </div>
              </Field>
            </div>
          </Section>

          {/* Client */}
          <Section title="Client Details">
            <Field label="Name *">
              <Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Contact *">
                <Input value={client.contact} onChange={(e) => setClient({ ...client, contact: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Residence Address">
                <Input value={client.residence} onChange={(e) => setClient({ ...client, residence: e.target.value })} />
              </Field>
              <Field label="Event Venue">
                <Input value={client.venue} onChange={(e) => setClient({ ...client, venue: e.target.value })} />
              </Field>
            </div>
          </Section>

          {/* Event */}
          <Section title="Event Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Start Date">
                <Input type="date" value={eventDates.start} onChange={(e) => setEventDates({ ...eventDates, start: e.target.value })} />
              </Field>
              <Field label="End Date">
                <Input type="date" value={eventDates.end} onChange={(e) => setEventDates({ ...eventDates, end: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tap the day(s) this booking covers, then add an event day for each
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {eventDays.map((d) => (
                <span key={d} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm">
                  {d}
                  <button onClick={() => setEventDays(eventDays.filter((x) => x !== d))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setEventDays([...eventDays, "New Day"])}>
              <Plus className="w-3.5 h-3.5" />
              Add Event Day
            </Button>
          </Section>

          {/* Includes */}
          <Section title="Includes (Deliverables)">
            <div className="flex flex-wrap gap-2">
              {deliverables.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDeliverable(d)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm border transition-colors",
                    included.includes(d)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted/40"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3">
              <Plus className="w-3.5 h-3.5" />
              Add Custom Deliverable
            </Button>
          </Section>

          {/* Pricing */}
          <Section title="Pricing">
            <Field label="Total Amount (₹)">
              <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0" />
            </Field>
            <div className="flex items-center gap-3 mt-3">
              <Toggle checked={includeTerms} onChange={setIncludeTerms} label="Include Terms & Conditions" />
              <span className="text-sm font-medium">Include Terms & Conditions</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Adds your T&C and a signature block to the PDF
            </p>
          </Section>
        </div>

        {/* Sticky PDF panel */}
        <div className="lg:sticky lg:top-20 h-fit space-y-2">
          <h3 className="text-sm font-semibold mb-1">Generate PDF</h3>
          <Button variant="dark" className="w-full">Client Quotation</Button>
          <Button variant="outline" className="w-full">Team / Job Sheet</Button>
          <Button variant="outline" className="w-full">
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Form
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">· {hint}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}