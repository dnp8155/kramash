import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { Users, Package } from "lucide-react";
import { useT } from "@/hooks/useT";

// Shown before finalizing when the quotation has no team, no services, or roles with no member chosen.
// Those quotations can still be finalized, but the event only gets team / service cards for the people
// and services that are actually attached, so the owner is asked once.
export default function MissingAssignmentsDialog({ open, noTeam, noServices, roleOnly = [], onBack, onContinue }) {
  const t = useT();
  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onBack()}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader><AppDialogTitle>{t("Team & services not fully set")}</AppDialogTitle></AppDialogHeader>
        <AppDialogBody className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            {t("The event gets a card for every team member and service attached to this quotation. These are still open:")}
          </p>
          <ul className="space-y-2 text-sm">
            {noTeam && (
              <li className="flex items-start gap-2"><Users className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />{t("No team added.")}</li>
            )}
            {!noTeam && roleOnly.length > 0 && (
              <li className="flex items-start gap-2">
                <Users className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>
                  {roleOnly.length} {roleOnly.length === 1 ? t("role has") : t("roles have")} {t("no member selected")}
                  <span className="block text-xs text-muted-foreground">{[...new Set(roleOnly)].join(", ")}</span>
                </span>
              </li>
            )}
            {noServices && (
              <li className="flex items-start gap-2"><Package className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />{t("No services added.")}</li>
            )}
          </ul>
          <p className="text-xs text-muted-foreground">
            {t("You can finalize now and attach members later, but those roles and services won't have event cards until they are.")}
          </p>
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={onBack}>{t("Go back and add")}</Button>
          <Button variant="dark" onClick={onContinue}>{t("Continue anyway")}</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
