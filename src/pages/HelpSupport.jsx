import { useState } from "react";
import {
  HelpCircle,
  Mail,
  Bug,
  Rocket,
  ChevronDown,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

const FAQS = [
  {
    q: "How do I create my first event or project?",
    a: "Go to Events (or Projects) from the sidebar, click the Create button, fill in the title, client, dates, and type, then save. You can assign team members and services afterward from the event detail page.",
  },
  {
    q: "How do I assign team members to an event?",
    a: "Open the event, click Assign Team, select a member, choose their role and working dates, set the agreed rate, and save. You can record a payment at the same time using the Record Payment Now toggle.",
  },
  {
    q: "How do payments work?",
    a: "Payments are recorded as financial transactions linked to events, team assignments, or service assignments. Each payment is assigned to a Financial Year based on its date. You can void a payment if needed — voided payments are excluded from totals but retained for audit.",
  },
  {
    q: "Can I customize event types and statuses?",
    a: "Yes. Go to Preferences → Event Types & Statuses to add, edit, or remove types and statuses for your workspace. Changes apply to all new events; existing events keep their saved values.",
  },
  {
    q: "How do I create a quotation?",
    a: "Go to Quotation & Agreement, click New Quotation, select a client and optional event, add line items (services, roles, or custom lines), apply discounts and GST if applicable, then finalize.",
  },
  {
    q: "What is a Financial Year and why does it matter?",
    a: "Financial Years organize your transactions for reporting (e.g. FY 2026–27 = April 1 2026 to March 31 2027). Every transaction is automatically assigned to a FY based on its date. You can switch the active FY from the top of the Financial page.",
  },
  {
    q: "How do I upgrade to Pro?",
    a: "Go to Your Plan from the sidebar, choose a billing cycle (Monthly, 6 Months, or Annual), and click Pay Online or Request Upgrade. Pro unlocks unlimited events, team members, services, GST quotations, and more.",
  },
  {
    q: "Is my data workspace-specific?",
    a: "Yes. All your events, clients, team members, services, payments, and settings are scoped to your workspace. Other workspaces cannot see your data.",
  },
];

const GETTING_STARTED = [
  { step: 1, title: "Set up your workspace", desc: "Go to Preferences to configure your business name, category, GST details, and branding." },
  { step: 2, title: "Add team members & roles", desc: "Go to Team to add people and define roles with default rates." },
  { step: 3, title: "Create services", desc: "Go to Preferences → Service Rates to define your service offerings and default pricing." },
  { step: 4, title: "Create your first event", desc: "Go to Events, create an event, assign your team, and start tracking payments." },
  { step: 5, title: "Generate quotations", desc: "Use the Quotation & Agreement module to create and send professional quotes to clients." },
];

export default function HelpSupport() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState({ subject: "", description: "" });
  const [sending, setSending] = useState(false);

  const handleSendReport = async () => {
    if (!report.subject.trim() || !report.description.trim()) {
      toast({ title: "Please fill in both fields", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: "support@kramashah.com",
        subject: `[Support] ${report.subject.trim()}`,
        body: `Workspace: ${currentWorkspace?.name || "Unknown"}\nUser: ${user?.email || "Unknown"}\n\n${report.description.trim()}`,
      });
      toast({ title: "Report submitted", description: "We'll get back to you shortly." });
      setReport({ subject: "", description: "" });
      setReportOpen(false);
    } catch (e) {
      toast({ title: "Failed to send", description: e?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Help & Support"
        description="Guides, FAQs, and ways to reach us — all in one place."
      />

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer transition-shadow hover:shadow-md" >
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Getting Started</p>
              <p className="text-xs text-muted-foreground">New here? Start with the basics.</p>
            </div>
          </CardBody>
        </Card>
        <Card className="cursor-pointer transition-shadow hover:shadow-md">
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">FAQs</p>
              <p className="text-xs text-muted-foreground">Common questions answered below.</p>
            </div>
          </CardBody>
        </Card>
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setReportOpen(true)}>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Report a Problem</p>
              <p className="text-xs text-muted-foreground">Found a bug? Let us know.</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-border">
            {GETTING_STARTED.map((item) => (
              <div key={item.step} className="flex items-start gap-4 px-5 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-border">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="text-sm font-medium text-foreground">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <CardTitle>Contact Support</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Need help with something specific? Reach out and our team will assist you.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              <Bug className="h-4 w-4" /> Report a Problem
            </Button>
            <a href="mailto:support@kramashah.com">
              <Button variant="outline">
                <Mail className="h-4 w-4" /> Email Support
              </Button>
            </a>
          </div>
        </CardBody>
      </Card>

      {/* Report a Problem Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setReportOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-card shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">Report a Problem</h2>
              <button
                onClick={() => setReportOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <div className="ks-scrollbar overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-4">
                <Input
                  label="Subject"
                  value={report.subject}
                  onChange={(e) => setReport({ ...report, subject: e.target.value })}
                  placeholder="Brief summary of the issue"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <textarea
                    value={report.description}
                    onChange={(e) => setReport({ ...report, description: e.target.value })}
                    rows={5}
                    placeholder="Describe what happened, what you expected, and any steps to reproduce…"
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
              <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
              <Button onClick={handleSendReport} disabled={sending}>
                {sending ? "Sending…" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}