import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { paymentMethods } from "@/constants/finance";

// Shared amount / date / method / reference / notes fields used by every
// record-payment and edit-transaction modal.
export default function TransactionFields({ form, setField }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input
        label="Amount"
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        value={form.amount}
        onChange={(e) => setField("amount", e.target.value)}
        error={form.error?.amount}
      />
      <Input
        label="Payment Date"
        type="date"
        value={form.transaction_date}
        onChange={(e) => setField("transaction_date", e.target.value)}
        error={form.error?.transaction_date}
      />
      <Select
        label="Payment Method"
        value={form.payment_method}
        onChange={(e) => setField("payment_method", e.target.value)}
      >
        {paymentMethods.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </Select>
      <Input
        label="Reference Number"
        value={form.reference_number}
        onChange={(e) => setField("reference_number", e.target.value)}
        placeholder="UTR / cheque no."
      />
      <Input
        label="Notes"
        value={form.notes}
        onChange={(e) => setField("notes", e.target.value)}
        className="sm:col-span-2"
      />
    </div>
  );
}