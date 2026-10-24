import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Landmark, Smartphone, Globe, Instagram, Youtube, Twitter, Plus, Trash2 } from "lucide-react";
import { getSocialIcon, EXTRA_SOCIAL_ICON_OPTIONS } from "@/lib/socialIcons";
import { useT } from "@/hooks/useT";
import { Section } from "@/components/quotation/QuotationParts";
import { sanitizeAccountNumber, validateSocialUrl } from "@/lib/validation";

function SocialInput({ label, url, onChange, placeholder, DefaultIcon, disabled, platform }) {
  const Icon = getSocialIcon(url) || DefaultIcon;
  const err = validateSocialUrl(url, platform);
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input value={url} onChange={onChange} disabled={disabled} placeholder={placeholder} className="pl-9" />
      </div>
      {err && <p className="text-[11px] mt-1 text-destructive">{err}</p>}
    </div>
  );
}

export default function InvoiceBankDetailsSection({
  bankDetails, setBankDetails,
  socialLinks, setSocialLinks,
  workspace, readOnly
}) {
  const t = useT();
  const updateBank = (field, value) => setBankDetails((prev) => ({ ...prev, [field]: value }));
  const updateSocial = (field, value) => setSocialLinks((prev) => ({ ...prev, [field]: value }));

  const getWorkspaceDefaults = () => {
    try {
      const raw = workspace?.display_preferences;
      if (!raw) return {};
      return typeof raw === "object" ? raw : JSON.parse(raw);
    }
    catch { return {}; }
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
      extra: Array.isArray(prefs.social_extra) ? prefs.social_extra.slice(0, 2) : []
    });
  };

  const extra = Array.isArray(socialLinks?.extra) ? socialLinks.extra : [];
  const setExtra = (next) => setSocialLinks((prev) => ({ ...prev, extra: next }));

  return (
    <div className="space-y-4">
      <Section
        collapsible
        icon={Landmark}
        title={t("Bank & UPI Details")}
        subtitle={`(${t("shown on PDF & public link")})`}
        action={!readOnly && (
          <button type="button" onClick={loadBankFromWorkspace} className="text-xs text-primary sm:hover:underline shrink-0">{t("Load from workspace")}</button>
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("Account Name")}</label>
            <Input value={bankDetails?.account_name || ""} onChange={(e) => updateBank("account_name", e.target.value)} disabled={readOnly} placeholder={t("Account holder name")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("Bank Name")}</label>
            <Input value={bankDetails?.bank_name || ""} onChange={(e) => updateBank("bank_name", e.target.value)} disabled={readOnly} placeholder={t("Bank name")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("Account Number")}</label>
            <Input value={bankDetails?.account_number || ""} onChange={(e) => updateBank("account_number", sanitizeAccountNumber(e.target.value))} inputMode="numeric" maxLength={18} disabled={readOnly} placeholder={t("Account number")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("IFSC Code")}</label>
            <Input value={bankDetails?.ifsc || ""} onChange={(e) => updateBank("ifsc", e.target.value)} disabled={readOnly} placeholder={t("IFSC code")} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> UPI ID
            </label>
            <Input value={bankDetails?.upi_id || ""} onChange={(e) => updateBank("upi_id", e.target.value)} disabled={readOnly} placeholder="UPI ID" />
            <p className="text-xs text-muted-foreground mt-1">{t("A scannable UPI QR code is auto-generated on the public invoice from this ID.")}</p>
          </div>
        </div>
      </Section>

      <Section
        collapsible
        icon={Globe}
        title={t("Social Links")}
        subtitle={`(${t("shown on PDF & public link footer")})`}
        action={!readOnly && (
          <button type="button" onClick={loadSocialFromWorkspace} className="text-xs text-primary sm:hover:underline shrink-0">{t("Load from workspace")}</button>
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SocialInput platform="instagram" label="Instagram" url={socialLinks?.instagram || ""} onChange={(e) => updateSocial("instagram", e.target.value)} disabled={readOnly} placeholder="https://instagram.com/…" DefaultIcon={Instagram} />
          <SocialInput platform="youtube" label="YouTube" url={socialLinks?.youtube || ""} onChange={(e) => updateSocial("youtube", e.target.value)} disabled={readOnly} placeholder="https://youtube.com/…" DefaultIcon={Youtube} />
          <SocialInput platform="twitter" label="Twitter / X" url={socialLinks?.twitter ?? socialLinks?.portfolio ?? ""} onChange={(e) => updateSocial("twitter", e.target.value)} disabled={readOnly} placeholder="https://x.com/…" DefaultIcon={Twitter} />
          <SocialInput platform="website" label={t("Website")} url={socialLinks?.website || ""} onChange={(e) => updateSocial("website", e.target.value)} disabled={readOnly} placeholder="https://…" DefaultIcon={Globe} />
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-foreground">{t("Additional Links (optional)")}</h5>
            {!readOnly && extra.length < 2 && (
              <button type="button" onClick={() => setExtra([...extra, { icon: "facebook", url: "" }])} className="text-xs text-primary sm:hover:text-primary-hover flex items-center gap-1">
                <Plus className="w-3 h-3" /> {t("Add link")}
              </button>
            )}
          </div>
          {extra.length > 0 && (
            <div className="space-y-2">
              {extra.map((s, i) => {
                const opt = EXTRA_SOCIAL_ICON_OPTIONS.find((o) => o.v === s.icon) || EXTRA_SOCIAL_ICON_OPTIONS[0];
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Select value={s.icon} onChange={(e) => setExtra(extra.map((x, idx) => (idx === i ? { ...x, icon: e.target.value } : x)))} disabled={readOnly} className="flex-1 sm:flex-none sm:w-36 min-w-0">
                      {EXTRA_SOCIAL_ICON_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </Select>
                    <div className="relative order-last basis-full sm:order-none sm:basis-0 sm:flex-1 min-w-0">
                      <opt.Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input value={s.url} onChange={(e) => setExtra(extra.map((x, idx) => (idx === i ? { ...x, url: e.target.value } : x)))} disabled={readOnly} placeholder="https://…" className="pl-9" />
                    </div>
                    {validateSocialUrl(s.url, s.icon || "other") && <p className="basis-full text-[11px] text-destructive">{validateSocialUrl(s.url, s.icon || "other")}</p>}
                    {!readOnly && (
                      <button type="button" onClick={() => setExtra(extra.filter((_, idx) => idx !== i))} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground sm:hover:text-destructive sm:hover:bg-destructive/5 transition-colors shrink-0" aria-label={t("Remove link")}>
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
    </div>
  );
}