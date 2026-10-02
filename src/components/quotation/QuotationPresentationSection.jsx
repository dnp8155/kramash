import Input from "@/components/common/Input";
import Toggle from "@/components/common/Toggle";
import { Section, Field } from "@/components/quotation/QuotationParts";
import { Textarea } from "@/components/ui/textarea";
import WordCounterTextarea from "@/components/common/WordCounterTextarea";
import SectionVisibilityToggles from "@/components/quotation/SectionVisibilityToggles";
import Select from "@/components/common/Select";
import { Eye, Building2, Share2, MessageSquare, StickyNote, Instagram, Youtube, Globe, Twitter, Plus, Trash2 } from "lucide-react";
import { getSocialIcon, EXTRA_SOCIAL_ICON_OPTIONS } from "@/lib/socialIcons";
import { useT } from "@/hooks/useT";

function SocialField({ label, url, onChange, placeholder, defaultIcon: DefaultIcon, disabled }) {
  const DetectedIcon = getSocialIcon(url);
  const Icon = DetectedIcon || DefaultIcon;
  return (
    <Field label={label}>
      <div className="relative">
        <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input value={url} onChange={onChange} disabled={disabled} placeholder={placeholder} className="pl-9" />
      </div>
    </Field>
  );
}

export default function QuotationPresentationSection({
  showPricing, setShowPricing,
  bankDetails, setBankDetails,
  socialLinks, setSocialLinks,
  footerMessage, setFooterMessage,
  specialNotes, setSpecialNotes,
  workspace, readOnly,
  visibility, setVisibility
}) {
  const t = useT();
  const getWorkspaceDefaults = () => {
    try {
      const raw = workspace?.display_preferences;
      if (!raw) return {};
      return typeof raw === "object" ? raw : JSON.parse(raw);
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
      website: workspace?.website || "",
      twitter: prefs.social_twitter || prefs.social_portfolio || "",
      extra: Array.isArray(prefs.social_extra) ? prefs.social_extra.slice(0, 2) : [],
    });
  };

  const extra = Array.isArray(socialLinks.extra) ? socialLinks.extra : [];
  const addExtraSocial = () => {
    if (extra.length >= 2) return;
    setSocialLinks({ ...socialLinks, extra: [...extra, { icon: "facebook", url: "" }] });
  };
  const updateExtraSocial = (i, field, value) => {
    setSocialLinks({ ...socialLinks, extra: extra.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)) });
  };
  const removeExtraSocial = (i) => {
    setSocialLinks({ ...socialLinks, extra: extra.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      <Section icon={Eye} title={t("Client-Facing Presentation")}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{t("Show Qty, Rate & Amount to Client")}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{t("When OFF, the client sees only day/event, included items, and the final total. Admin always retains full pricing data.")}</p>
          </div>
          <Toggle checked={showPricing} onChange={setShowPricing} label={t("Show pricing")} disabled={readOnly} />
        </div>
      </Section>

      <Section icon={Building2} title={t("Bank & UPI Details")}>
        <div className="mb-3">
          <SectionVisibilityToggles sectionKey="bank" visibility={visibility} setVisibility={setVisibility} readOnly={readOnly} />
        </div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{t("Snapshot — future Preference changes won't affect this quotation.")}</p>
          {!readOnly && (
            <button onClick={loadBankFromWorkspace} className="text-xs text-primary sm:hover:underline">{t("Load from workspace")}</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("Account Name")}>
            <Input value={bankDetails.account_name || ""} onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label={t("Bank Name")}>
            <Input value={bankDetails.bank_name || ""} onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label={t("Account Number")}>
            <Input value={bankDetails.account_number || ""} onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label={t("IFSC")}>
            <Input value={bankDetails.ifsc || ""} onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })} disabled={readOnly} />
          </Field>
          <Field label={t("UPI ID")}>
            <Input value={bankDetails.upi_id || ""} onChange={(e) => setBankDetails({ ...bankDetails, upi_id: e.target.value })} disabled={readOnly} />
          </Field>
        </div>
      </Section>

      <Section icon={Share2} title={t("Social Links")}>
        <div className="mb-3">
          <SectionVisibilityToggles sectionKey="social" visibility={visibility} setVisibility={setVisibility} readOnly={readOnly} />
        </div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{t("Only non-empty links will be shown to the client. Icons auto-detect from the URL.")}</p>
          {!readOnly && (
            <button onClick={loadSocialFromWorkspace} className="text-xs text-primary sm:hover:underline">{t("Load from workspace")}</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SocialField label="Instagram" url={socialLinks.instagram || ""} onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })} disabled={readOnly} placeholder="https://instagram.com/…" defaultIcon={Instagram} />
          <SocialField label="YouTube" url={socialLinks.youtube || ""} onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })} disabled={readOnly} placeholder="https://youtube.com/…" defaultIcon={Youtube} />
          <SocialField label="Twitter / X" url={socialLinks.twitter ?? socialLinks.portfolio ?? ""} onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })} disabled={readOnly} placeholder="https://x.com/…" defaultIcon={Twitter} />
          <SocialField label={t("Website")} url={socialLinks.website || ""} onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })} disabled={readOnly} placeholder="https://…" defaultIcon={Globe} />
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-foreground">{t("Additional Links (optional)")}</h5>
            {!readOnly && extra.length < 2 && (
              <button type="button" onClick={addExtraSocial} className="text-xs text-primary sm:hover:text-primary-hover flex items-center gap-1">
                <Plus className="w-3 h-3" /> {t("Add link")}
              </button>
            )}
          </div>
          {extra.length > 0 && (
            <div className="space-y-2">
              {extra.map((s, i) => {
                const opt = EXTRA_SOCIAL_ICON_OPTIONS.find((o) => o.v === s.icon) || EXTRA_SOCIAL_ICON_OPTIONS[0];
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={s.icon} onChange={(e) => updateExtraSocial(i, "icon", e.target.value)} disabled={readOnly} className="w-36 shrink-0">
                      {EXTRA_SOCIAL_ICON_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </Select>
                    <div className="relative flex-1">
                      <opt.Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input value={s.url} onChange={(e) => updateExtraSocial(i, "url", e.target.value)} disabled={readOnly} placeholder="https://…" className="pl-9" />
                    </div>
                    {!readOnly && (
                      <button type="button" onClick={() => removeExtraSocial(i)} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground sm:hover:text-destructive sm:hover:bg-destructive/5 transition-colors shrink-0" aria-label={t("Remove link")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      <Section icon={MessageSquare} title={t("Footer / Thank You Message")}>
        <div className="mb-3">
          <SectionVisibilityToggles sectionKey="footer" visibility={visibility} setVisibility={setVisibility} readOnly={readOnly} />
        </div>
        <Textarea
          value={footerMessage || ""} onChange={(e) => setFooterMessage(e.target.value)} disabled={readOnly} rows={2}
          placeholder={t("Thank you message shown at the bottom of the quotation")}
        />
      </Section>

      <Section icon={StickyNote} title={t("Special Notes (Scope-Specific)")}>
        <div className="mb-3">
          <SectionVisibilityToggles sectionKey="special_notes" visibility={visibility} setVisibility={setVisibility} readOnly={readOnly} />
        </div>
        <WordCounterTextarea
          value={specialNotes || ""} onChange={(e) => setSpecialNotes(e.target.value)} disabled={readOnly} rows={3}
          placeholder={t("Travel, accommodation, revision limits, client requirements, other operational notes…")}
        />
      </Section>
    </div>
  );
}