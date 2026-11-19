import { useMemo } from "react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { paymentPreset, methodLabel, accountFieldRules, sanitizeAccountFor } from "@/constants/paymentRegions";

// The workspace currency's payment options (constants/paymentRegions.js), for screens:
//   label(m)          → what to show for a stored method value ("UPI" → "Zelle" in the US)
//   methodsWith(cur)  → the methods a dropdown offers; an older record's method is kept so it never vanishes
//   defaultOnline     → the usual online method there ("UPI" in India, else "Bank Transfer")
//   preset            → field labels (accountLabel, codeLabel, wallet, walletIdLabel, showUpiQr)
export function usePaymentPreset() {
  const { workspace } = useWorkspace();
  const currency = workspace?.currency;
  return useMemo(() => {
    const preset = paymentPreset(currency);
    return {
      currency,
      preset,
      label: (m) => methodLabel(m, currency),
      methodsWith: (current) => (current && !preset.methods.includes(current) ? [...preset.methods, current] : preset.methods),
      defaultOnline: preset.showUpiQr ? "UPI" : "Bank Transfer",
      account: accountFieldRules(currency),
      sanitizeAccount: (raw) => sanitizeAccountFor(raw, currency),
    };
  }, [currency]);
}
