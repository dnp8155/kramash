import Input from "@/components/common/Input";
import Toggle from "@/components/common/Toggle";
import { Section, Field } from "@/components/quotation/QuotationParts";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Building2, Share2, MessageSquare, StickyNote } from "lucide-react";

export default function QuotationPresentationSection({
  showPricing, setShowPricing,
  bankDetails, setBankDetails,
  socialLinks, setSocialLinks,
  footerMessage, setFooterMessage,
  specialNotes, setSpecialNotes,
  workspace, readOnly
}) {
  // Parse workspace display_preferences for bank/social defaults
  const getWorkspaceDefaults = () => {
    try {
      const prefs = JSON.parse(workspace?.display_preferences || "{}");
      return prefs;
    } catch { return {}; }
  };

  const loadBankFromWorkspace = () => {
    const prefs = getWorkspaceDefaults();
    setBankDetails({
      account_name: prefs.bank_account_name || "",
      bank_name: prefs.bank_name || "",
      account_number: prefs.bank_account_number || "",
      ifsc: prefs.bank_ifsc || "",
      upi_id: prefs.bank_upi_id || ""
    });
  };

  const loadSocialFromWorkspace = () => {
    const prefs = getWorkspaceDefaults();
    setSocialLinks({
      instagram: prefs.social_instagram || "",
      youtube: prefs.social_youtube || "",
      website: prefs.social_website || "",
      portfolio: prefs.social_portfolio || ""
    });
  };

  return (
    <div className="space-y-4">
      {/* Show Pricing */}
      <Section icon={Eye} title="Client-Facing Presentation">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Show Qty, Rate & Amount to Client</span>
            <p className="text-xs text-muted-foreground mt-0.5">When OFF, the client sees only day/event, included items, and the final total. Admin always retains full pricing data.</p>
          </div>
          <Toggle checked={showPricing} onChange={setShowPricing} label="Show pricing" disabled={readOnly} />
        </div>
      </Section>

      {/* Bank & UPI Details */}
      <Section icon={Building2} title="Bank & UPI Details">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Snapshot — future Preference changes won't affect this quotation.</p>
          {!readOnly && (
            <button onClick={loadBankFromWorkspace} className="text-xs text-primary hover:underline">Load from workspace</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Account Name">
            <Input value={bankDetails.account_name || ""} onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label="Bank Name">
            <Input value={bankDetails.bank_name || ""} onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label="Account Number">
            <Input value={bankDetails.account_number || ""} onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label="IFSC">
            <Input value={bankDetails.ifsc || ""} onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label="UPI ID">
            <Input value={bankDetails.upi_id || ""} onChange={(e) => setBankDetails({ ...bankDetails, upi_id: e.target.value })} disabled={readOnly} />
          </Field>
        </div>
      </Section>

      {/* Social Links */}
      <Section icon={Share2} title="Social Links">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Only non-empty links will be shown to the client.</p>
          {!readOnly && (
            <button onClick={loadSocialFromWorkspace} className="text-xs text-primary hover:underline">Load from workspace</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Instagram">
            <Input value={socialLinks.instagram || ""} onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })} disabled={readOnly} placeholder="https://instagram.com/…" />
          </Field>
          <Field label="YouTube">
            <Input value={socialLinks.youtube || ""} onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })} disabled={readOnly} placeholder="https://youtube.com/…" />
          </Field>
          <Field label="Website">
            <Input value={socialLinks.website || ""} onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })} disabled={readOnly} placeholder="https://…" />
          </Field>
          <Field label="Portfolio">
            <Input value={socialLinks.portfolio || ""} onChange={(e) => setSocialLinks({ ...socialLinks, portfolio: e.target.value })} disabled={readOnly} placeholder="https://…" />
          </Field>
        </div>
      </Section>

      {/* Footer Message */}
      <Section icon={MessageSquare} title="Footer / Thank You Message">
        <Textarea
          value={footerMessage || ""}
          onChange={(e) => setFooterMessage(e.target.value)}
          disabled={readOnly}
          rows={2}
          placeholder="Thank you message shown at the bottom of the quotation"
        />
      </Section>

      {/* Special Notes */}
      <Section icon={StickyNote} title="Special Notes (Scope-Specific)">
        <Textarea
          value={specialNotes || ""}
          onChange={(e) => setSpecialNotes(e.target.value)}
          disabled={readOnly}
          rows={3}
          placeholder="Travel, accommodation, revision limits, client requirements, other operational notes…"
        />
      </Section>
    </div>
  );
}