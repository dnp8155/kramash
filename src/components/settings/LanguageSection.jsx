import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import { getAppLanguage } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "gu", label: "ગુજરાતી" },
];

export default function LanguageSection() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const current = getAppLanguage(user);
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSelected(current); }, [current]);

  const hasChange = selected !== current;

  const handleSave = async () => {
    if (!hasChange) return;
    setSaving(true);
    try {
      await base44.auth.updateMe({ language: selected });
      await checkUserAuth();
      toast({ title: "Language updated" });
    } catch (e) {
      toast({ title: "Failed to update language", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Choose your preferred language for the app interface.</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full pl-10">
            {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}
          </Select>
        </div>
        <Button size="md" onClick={handleSave} disabled={!hasChange || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}