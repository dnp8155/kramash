import { useState, useEffect } from "react";
import { useT } from "@/hooks/useT";
import { base44 } from "@/api/base44Client";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { lookupCity } from "@/lib/cityMapping";
import { isValidIndianMobile, isValidEmail, sanitizePhoneInput, PHONE_HINT, sanitizeEmailInput } from "@/lib/validation";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateRelated, upsertOptimistic } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

const empty = {
  name: "", phone: "", alternate_phone: "", email: "",
  address: "", city: "", state: "", country: "", notes: ""
};

// Coerce every field to a string so null/undefined from the DB never crashes .trim()
function coerceStrings(client) {
  if (!client) return empty;
  const out = { ...empty };
  for (const k of Object.keys(empty)) {
    out[k] = client[k] == null ? "" : String(client[k]);
  }
  return out;
}

export default function ClientForm({ open, onClose, onSaved, client = null, workspaceId }) {
  const queryClient = useQueryClient();
  const t = useT();
  const [form, setForm] = useState(empty);
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(coerceStrings(client));
    }
  }, [open, client]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-fill state & country when city matches a known Indian city.
  const onCityChange = (val) => {
    set("city", val);
    const match = lookupCity(val);
    if (match) {
      setForm((f) => ({ ...f, city: val, state: match.state, country: match.country }));
    }
  };

  const validate = () => {
    if (!form.name?.trim()) return t("Client name is required.");
    if (!form.phone?.trim() && !form.email?.trim()) return t("Phone or email is required.");
    if (form.phone && !isValidIndianMobile(form.phone)) return PHONE_HINT;
    if (form.alternate_phone && !isValidIndianMobile(form.alternate_phone)) return PHONE_HINT;
    if (form.email && !isValidEmail(form.email)) return t("Enter a valid email address.");
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    if (!start()) return;
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        name: form.name?.trim() || "",
        phone: form.phone?.trim() || "",
        alternate_phone: form.alternate_phone?.trim() || "",
        email: form.email?.trim() || "",
        address: form.address?.trim() || "",
        city: form.city?.trim() || "",
        state: form.state?.trim() || "",
        country: form.country?.trim() || "",
        notes: form.notes?.trim() || ""
      };
      let saved;
      if (client?.id) {
        saved = await base44.entities.Client.update(client.id, payload);
      } else {
        saved = await base44.entities.Client.create(payload);
      }
      upsertOptimistic(queryClient, ["clients", workspaceId], saved,
        (d) => d?.clients, (d, list) => ({ ...d, clients: list }));
      invalidateRelated(queryClient, "Client");
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || t("Failed to save client. Please try again."));
    } finally {
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>{client ? t("Edit Client") : t("Add Client")}</AppDialogTitle>
          <AppDialogDescription>
            {client ? t("Update client details.") : t("Create a new client in this workspace.")}
          </AppDialogDescription>
        </AppDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <AppDialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("Client Name")} <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("Client name")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("Phone")}</Label>
              <Input type="tel" value={form.phone} onChange={(e) => set("phone", sanitizePhoneInput(e.target.value))} placeholder={t("Mobile number")} inputMode="tel" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Alternate Phone")}</Label>
              <Input type="tel" value={form.alternate_phone} onChange={(e) => set("alternate_phone", sanitizePhoneInput(e.target.value))} placeholder={t("Optional")} inputMode="tel" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("Email")}</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", sanitizeEmailInput(e.target.value))} inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={t("Email address")} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("Address")}</Label>
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} placeholder={t("Street address")} rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t("City")}</Label>
              <Input value={form.city} onChange={(e) => onCityChange(e.target.value)} placeholder={t("City")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("State")}</Label>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Country")}</Label>
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("Notes")}</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("Internal notes")} rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          </AppDialogBody>

          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("Saving…") : client ? t("Save Changes") : t("Add Client")}
            </Button>
          </AppDialogFooter>
        </form>
      </AppDialogContent>
    </AppDialog>
  );
}