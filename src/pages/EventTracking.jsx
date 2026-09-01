import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import {
  Calendar, MapPin, CheckCircle2, Circle, Clock, Wallet, Users,
  FileText, Phone, Mail, ArrowRight, Loader2, Sparkles, PartyPopper
} from "lucide-react";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";

function money(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return `${sym}${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function dateShort(d) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function dateLong(d) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
}

const STATUS_META = {
  upcoming: { label: "Upcoming", color: "text-blue-600", bg: "bg-blue-50", dot: "bg-blue-500" },
  "in-progress": { label: "In Progress", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" },
  completed: { label: "Completed", color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50", dot: "bg-red-500" }
};

export default function EventTracking() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await base44.functions.invoke("getPublicEventData", { event_id: id });
        setData(res.data);
      } catch (e) {
        setError(e?.message || "Failed to load event details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-medium">Loading your event details…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Event details unavailable</h1>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const { event, business, client, payment, team, quotation, milestones } = data;
  const statusMeta = STATUS_META[event.status] || STATUS_META.upcoming;
  const eventDates = event.event_dates && event.event_dates.length > 0
    ? event.event_dates
    : [event.start_date, event.end_date].filter(Boolean);
  const isMultiDay = eventDates.length > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Branded Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-md bg-white/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {business.logo ? (
              <Image src={business.logo} alt={business.name} className="w-9 h-9 rounded-lg object-cover" fittingType="fill" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-slate-900">{business.name || "Event Details"}</div>
              {business.city && <div className="text-xs text-slate-500">{business.city}</div>}
            </div>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusMeta.bg} ${statusMeta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot} ${event.status === "in-progress" ? "animate-pulse" : ""}`} />
            {statusMeta.label}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero / Event Title */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 text-white p-6 sm:p-8 shadow-xl">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="relative">
            {client && (
              <div className="text-sm text-indigo-200 mb-2">
                Hi {client.name.split(" ")[0]} 👋
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{event.title}</h1>
            {event.event_type && (
              <div className="text-indigo-200 text-sm mt-1">{event.event_type}</div>
            )}
            <div className="flex flex-wrap gap-4 mt-5">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-indigo-200">Date</div>
                  <div className="font-medium">
                    {isMultiDay
                      ? `${dateShort(eventDates[0])} – ${dateShort(eventDates[eventDates.length - 1])}`
                      : dateLong(event.start_date)}
                  </div>
                </div>
              </div>
              {event.venue && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-indigo-200">Venue</div>
                    <div className="font-medium">{event.venue}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline / Milestones */}
        {milestones && milestones.length > 0 && (
          <Section>
            <SectionTitle icon={Clock} title="Event Timeline" />
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center gap-2 min-w-[80px] sm:min-w-[100px]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      m.done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                    }`}>
                      {m.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </div>
                    <div className="text-center">
                      <div className={`text-xs font-semibold ${m.done ? "text-slate-900" : "text-slate-400"}`}>
                        {m.label}
                      </div>
                      {m.date && <div className="text-[10px] text-slate-400 mt-0.5">{dateShort(m.date)}</div>}
                    </div>
                  </div>
                  {i < milestones.length - 1 && (
                    <div className={`h-0.5 w-8 sm:w-12 mx-1 rounded ${m.done ? "bg-emerald-400" : "bg-slate-200"}`} />
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Payment Progress */}
        {payment.contract_value > 0 && (
          <Section>
            <SectionTitle icon={Wallet} title="Payment Status" />
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold text-slate-900">{money(payment.received, payment.currency)}</span>
                  <span className="text-sm text-slate-500"> / {money(payment.contract_value, payment.currency)}</span>
                </div>
                <div className={`text-sm font-semibold ${
                  payment.progress === 100 ? "text-emerald-600" : payment.progress > 0 ? "text-amber-600" : "text-slate-400"
                }`}>
                  {payment.progress === 100 ? (
                    <span className="flex items-center gap-1"><PartyPopper className="w-4 h-4" /> Fully Paid</span>
                  ) : (
                    `${payment.progress}% paid`
                  )}
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    payment.progress === 100
                      ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                      : "bg-gradient-to-r from-indigo-500 to-indigo-600"
                  }`}
                  style={{ width: `${payment.progress}%` }}
                />
              </div>
              {payment.pending > 0 && (
                <div className="flex items-center justify-between text-sm pt-1">
                  <span className="text-slate-500">Pending balance</span>
                  <span className="font-semibold text-amber-600">{money(payment.pending, payment.currency)}</span>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Team */}
        {team && team.length > 0 && (
          <Section>
            <SectionTitle icon={Users} title="Your Team" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {team.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{m.name}</div>
                    {(m.profession || m.role) && (
                      <div className="text-xs text-slate-500 truncate">{m.profession || m.role}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Quotation CTA */}
        {quotation && (
          <a
            href={`${window.location.origin}/q/${quotation.id}`}
            className="block group"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 sm:p-6 shadow-lg transition-transform group-hover:scale-[1.01]">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-amber-50">Quotation {quotation.quotation_number}</div>
                    <div className="text-lg font-bold">
                      {money(quotation.grand_total, payment.currency)}
                    </div>
                    <div className="text-xs text-amber-100 mt-0.5">
                      {quotation.status === "accepted" ? "✓ Accepted" : "Tap to view & sign online"}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </a>
        )}

        {/* Event Description */}
        {event.description && (
          <Section>
            <SectionTitle icon={FileText} title="About This Event" />
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </Section>
        )}

        {/* Contact */}
        {(business.phone || business.email) && (
          <Section>
            <SectionTitle icon={Phone} title="Need Help? Contact Us" />
            <div className="flex flex-wrap gap-3">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <Phone className="w-4 h-4 text-indigo-600" />
                  {business.phone}
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <Mail className="w-4 h-4 text-indigo-600" />
                  {business.email}
                </a>
              )}
            </div>
          </Section>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 mt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-xs text-slate-400">
            Powered by <span className="font-semibold text-slate-500">Kramasha</span> · Professional Event Management
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-indigo-600" />
      </div>
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
    </div>
  );
}