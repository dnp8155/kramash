import Input from "@/components/common/Input";
import { Landmark, Smartphone, Globe, Instagram, Youtube } from "lucide-react";

export default function InvoiceBankDetailsSection({
  bankDetails, setBankDetails,
  socialLinks, setSocialLinks,
  readOnly
}) {
  const updateBank = (field, value) => setBankDetails((prev) => ({ ...prev, [field]: value }));
  const updateSocial = (field, value) => setSocialLinks((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Bank & UPI Details</h3>
          <span className="text-xs text-muted-foreground">(shown on PDF & public link)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Account Name</label>
            <Input value={bankDetails?.account_name || ""} onChange={(e) => updateBank("account_name", e.target.value)} disabled={readOnly} placeholder="Account holder name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Bank Name</label>
            <Input value={bankDetails?.bank_name || ""} onChange={(e) => updateBank("bank_name", e.target.value)} disabled={readOnly} placeholder="Bank name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Account Number</label>
            <Input value={bankDetails?.account_number || ""} onChange={(e) => updateBank("account_number", e.target.value)} disabled={readOnly} placeholder="Account number" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">IFSC Code</label>
            <Input value={bankDetails?.ifsc || ""} onChange={(e) => updateBank("ifsc", e.target.value)} disabled={readOnly} placeholder="IFSC code" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> UPI ID
            </label>
            <Input value={bankDetails?.upi_id || ""} onChange={(e) => updateBank("upi_id", e.target.value)} disabled={readOnly} placeholder="yourname@upi" />
            <p className="text-xs text-muted-foreground mt-1">A scannable UPI QR code is auto-generated on the public invoice from this ID.</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Social Links</h3>
          <span className="text-xs text-muted-foreground">(shown on PDF & public link footer)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Instagram className="w-3 h-3" /> Instagram
            </label>
            <Input value={socialLinks?.instagram || ""} onChange={(e) => updateSocial("instagram", e.target.value)} disabled={readOnly} placeholder="https://instagram.com/..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Youtube className="w-3 h-3" /> YouTube
            </label>
            <Input value={socialLinks?.youtube || ""} onChange={(e) => updateSocial("youtube", e.target.value)} disabled={readOnly} placeholder="https://youtube.com/..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Website</label>
            <Input value={socialLinks?.website || ""} onChange={(e) => updateSocial("website", e.target.value)} disabled={readOnly} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Portfolio</label>
            <Input value={socialLinks?.portfolio || ""} onChange={(e) => updateSocial("portfolio", e.target.value)} disabled={readOnly} placeholder="https://..." />
          </div>
        </div>
      </div>
    </div>
  );
}