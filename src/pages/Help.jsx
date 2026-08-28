import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useT } from "@/hooks/useT";
import { useToast } from "@/components/ui/use-toast";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import EmptyState from "@/components/common/EmptyState";
import LoadingState from "@/components/common/LoadingState";
import PageHeader from "@/components/common/PageHeader";
import {
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Send,
  Bug,
  Lightbulb,
  CreditCard,
  UserCircle,
  BookOpen
} from "lucide-react";

const categoryConfig = {
  bug: { label: "Bug Report", icon: Bug, color: "text-destructive" },
  feature_request: { label: "Feature Request", icon: Lightbulb, color: "text-warning" },
  billing: { label: "Billing Issue", icon: CreditCard, color: "text-primary" },
  account: { label: "Account Issue", icon: UserCircle, color: "text-primary" },
  general: { label: "General Question", icon: HelpCircle, color: "text-muted-foreground" }
};

const statusConfig = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-600" }
};

const priorityConfig = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-primary" },
  high: { label: "High", color: "text-warning" },
  urgent: { label: "Urgent", color: "text-destructive" }
};

const faqs = [
  {
    q: "How do I create my first event?",
    a: "Go to Events page, click 'New Event', fill in client, title, date, and venue. Your event will appear on the dashboard instantly."
  },
  {
    q: "How do I record a client payment?",
    a: "Open the event details, go to the Financial tab, click 'Record Payment'. Choose Client Receipt, enter amount and method, and save."
  },
  {
    q: "How do I assign team members to an event?",
    a: "Open event details, go to Team tab, click 'Assign Team Member'. Select the member, set their rate, and confirm. Conflicts are checked automatically."
  },
  {
    q: "How do I create and send a quotation?",
    a: "Go to Quotation page, click 'New Quotation'. Add items (services, roles, or custom), set pricing and GST, then finalize and share the link with your client."
  },
  {
    q: "How do I upgrade to Pro plan?",
    a: "Go to Your Plan page, click 'Upgrade to Pro'. Choose billing cycle, complete payment, and your plan upgrades instantly with all premium features."
  },
  {
    q: "Can I use KRAMAS offline?",
    a: "Yes. KRAMAS caches your data locally. You can view and edit data offline. Changes sync automatically when you reconnect to the internet."
  },
  {
    q: "How do I change my business category or work labels?",
    a: "Go to Settings → Workspace. You can change business type, category, and custom work labels (e.g., 'Project' instead of 'Event')."
  },
  {
    q: "How do I add or remove team members?",
    a: "Go to Team page, click 'Add Team Member' to create. To remove, open the member's details and click delete. You can also block dates for leaves."
  }
];

export default function Help() {
  const t = useT();
  const { toast } = useToast();
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  const [activeTab, setActiveTab] = useState("contact");
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const [form, setForm] = useState({
    subject: "",
    message: "",
    category: "general",
    priority: "medium"
  });

  useEffect(() => {
    if (activeTab === "tickets") {
      loadTickets();
    }
  }, [activeTab]);

  const loadTickets = async () => {
    if (!workspace?.id) return;
    setLoadingTickets(true);
    try {
      const data = await base44.entities.SupportTicket.filter({
        workspace_id: workspace.id
      }, "-created_date", 50);
      setTickets(data);
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast({ title: "Please fill in subject and message", variant: "destructive" });
      return;
    }
    if (!workspace?.id || !user?.id) {
      toast({ title: "Workspace or user not loaded", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.SupportTicket.create({
        workspace_id: workspace.id,
        user_id: user.id,
        user_name: user.full_name || "",
        user_email: user.email || "",
        subject: form.subject.trim(),
        message: form.message.trim(),
        category: form.category,
        priority: form.priority,
        status: "open"
      });
      toast({ title: "Support ticket submitted. We'll get back to you soon." });
      setForm({ subject: "", message: "", category: "general", priority: "medium" });
      setActiveTab("tickets");
      loadTickets();
    } catch (err) {
      console.error("Failed to submit ticket:", err);
      toast({ title: "Failed to submit ticket. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Help & Support")}
        subtitle={t("Get answers, report issues, or reach out to our team")}
        icon={LifeBuoy}
      />

      {/* Quick contact cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Submit a Ticket</h3>
            <p className="text-xs text-muted-foreground mt-1">Describe your issue and we'll respond via email.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setActiveTab("contact")}>
              <Plus className="w-3.5 h-3.5" /> New Ticket
            </Button>
          </div>
        </Card>

        <Card className="p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Email Us</h3>
            <p className="text-xs text-muted-foreground mt-1">For urgent issues, email directly.</p>
            <a href="mailto:support@kramas.app" className="text-xs text-primary font-medium mt-3 inline-block hover:underline">
              support@kramas.app
            </a>
          </div>
        </Card>

        <Card className="p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Response Time</h3>
            <p className="text-xs text-muted-foreground mt-1">We respond within 24-48 business hours.</p>
            <p className="text-xs text-muted-foreground mt-3">Mon–Fri, 10 AM – 7 PM IST</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: "contact", label: "Contact Us", icon: Send },
          { id: "tickets", label: "My Tickets", icon: MessageSquare },
          { id: "faq", label: "FAQs", icon: HelpCircle }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* Contact Form */}
      {activeTab === "contact" && (
        <Card className="p-6 max-w-2xl">
          <h3 className="text-base font-semibold text-foreground mb-1">Submit a Support Ticket</h3>
          <p className="text-sm text-muted-foreground mb-5">Fill in the details below and our team will get back to you.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Category</label>
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full"
                >
                  {Object.entries(categoryConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Priority</label>
                <Select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full"
                >
                  {Object.entries(priorityConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief summary of your issue"
                className="w-full"
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe your issue in detail. Include steps to reproduce if it's a bug."
                rows={5}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">{form.message.length}/2000</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setForm({ subject: "", message: "", category: "general", priority: "medium" })}>
                Clear
              </Button>
              <Button type="submit" disabled={submitting}>
                <Send className="w-3.5 h-3.5" />
                {submitting ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* My Tickets */}
      {activeTab === "tickets" && (
        <div className="space-y-3">
          {loadingTickets ? (
            <LoadingState label="Loading your tickets..." />
          ) : tickets.length === 0 ? (
            <Card className="p-0">
              <EmptyState
                title="No tickets yet"
                description="When you submit a support ticket, it will appear here with its status."
                action={
                  <Button size="sm" onClick={() => setActiveTab("contact")}>
                    <Plus className="w-3.5 h-3.5" /> Submit First Ticket
                  </Button>
                }
              />
            </Card>
          ) : (
            tickets.map((ticket) => {
              const cat = categoryConfig[ticket.category] || categoryConfig.general;
              const status = statusConfig[ticket.status] || statusConfig.open;
              const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
              const CatIcon = cat.icon;
              return (
                <Card key={ticket.id} className="p-4 hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <CatIcon className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-foreground truncate">{ticket.subject}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className={priority.color}>{priority.label} priority</span>
                        <span>•</span>
                        <span>{cat.label}</span>
                        <span>•</span>
                        <span>{new Date(ticket.created_date).toLocaleDateString()}</span>
                      </div>
                      {ticket.admin_response && (
                        <div className="mt-3 p-3 rounded-md bg-success/5 border border-success/20">
                          <div className="flex items-center gap-1.5 mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            <span className="text-xs font-semibold text-success">Response from Support</span>
                          </div>
                          <p className="text-xs text-foreground">{ticket.admin_response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* FAQs */}
      {activeTab === "faq" && (
        <div className="space-y-2 max-w-3xl">
          {faqs.map((faq, idx) => (
            <Card key={idx} className="overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Footer note */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            For account or billing issues that need immediate attention, email us directly at{" "}
            <a href="mailto:support@kramas.app" className="text-primary font-medium hover:underline">support@kramas.app</a>.
            Include your workspace name and registered email for faster resolution.
          </p>
        </div>
      </Card>
    </div>
  );
}