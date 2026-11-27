import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { SIZE_UNITS } from "@/lib/storageService";

// A size typed as a number plus MB / GB / TB. value = { text, unit }; the caller turns it into GB with toGb().
export default function SizeInput({ value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={value.text}
        onChange={(e) => onChange({ ...value, text: e.target.value.replace(/[^0-9.]/g, "") })}
        inputMode="decimal"
        maxLength={10}
        placeholder={placeholder}
        className="flex-1"
      />
      <Select value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value })} className="w-24 shrink-0">
        {SIZE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.value}</option>)}
      </Select>
    </div>
  );
}
