import { useWorkspace } from "@/lib/WorkspaceContext";
import { receiptIcon, currencyIcon } from "@/utils/currencyIcon";

// A receipt icon that follows the workspace currency (₹ / $ / € / neutral). Used where an icon is set once in a
// constant, like the Invoices item in the menus, so it can't be given the currency directly.
export default function CurrencyReceiptIcon(props) {
  const { workspace } = useWorkspace();
  const Icon = receiptIcon(workspace?.currency);
  return <Icon {...props} />;
}

// The plain money icon (₹ / $ / € / symbol) for the workspace currency, for icon slots set in a constant.
export function CurrencyMoneyIcon(props) {
  const { workspace } = useWorkspace();
  const Icon = currencyIcon(workspace?.currency);
  return <Icon {...props} />;
}
