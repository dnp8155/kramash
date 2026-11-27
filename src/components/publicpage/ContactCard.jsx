import { Phone, Mail, Globe, MapPin, MessageCircle, ExternalLink, Contact, Share2 } from "lucide-react";
import Card from "@/components/common/Card";
import CardTitle from "@/components/publicpage/CardTitle";
import { sanitizePhoneInput, whatsappNumber } from "@/lib/validation";
import { SOCIAL_BRAND_COLORS } from "@/lib/socialIcons";
import { safeUrl } from "@/lib/publicSections";

// Label + value row with optional round action buttons — same layout as Client details.
function InfoRow({ icon: Icon, label, value, actions }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-sm text-foreground break-words">{value}</span>
          {actions}
        </div>
      </div>
    </div>
  );
}

const roundLink = "w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0";

// One card for how to reach the business: the details in two columns on wider screens, then, under a divider, the
// social links as a row of round icons. No social links: just the details. No details: just the social links.
export default function ContactCard({ ws, vis = {}, fullAddress, websiteUrl, socials = [], hasContact }) {
  if (!hasContact && socials.length === 0) return null;
  const icons = (
    <div className="flex flex-wrap items-center gap-2.5">
      {socials.map(({ url, Icon, label, key }) => {
        const brand = SOCIAL_BRAND_COLORS[key];
        return (
          <a
            key={url}
            href={safeUrl(url) || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="inline-flex items-center justify-center gap-2 w-9 sm:w-auto h-9 sm:px-3.5 rounded-full border border-border bg-card hover:bg-muted transition-colors"
          >
            <Icon style={brand ? { color: brand } : undefined} className={`w-[18px] h-[18px] shrink-0 overflow-visible ${brand ? "" : "text-foreground"}`} />
            {/* The name beside the icon on wider screens; on a phone just the icon (the name stays in aria-label). */}
            <span className="hidden sm:inline text-sm font-medium text-foreground">{label}</span>
          </a>
        );
      })}
    </div>
  );

  if (!hasContact) {
    return (
      <Card className="p-5">
        <CardTitle icon={Share2}>Connect with Us</CardTitle>
        {icons}
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <CardTitle icon={Contact}>Get in Touch</CardTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {vis.phone && ws.phone && (
          <InfoRow
            icon={Phone}
            label="Phone"
            value={ws.phone}
            actions={
              <div className="flex items-center gap-1.5 shrink-0">
                <a href={`tel:${sanitizePhoneInput(ws.phone)}`} className={`${roundLink} text-primary`} aria-label="Call" title="Call">
                  <Phone className="w-4 h-4 shrink-0 overflow-visible" />
                </a>
                <a href={`https://wa.me/${whatsappNumber(ws.phone)}`} target="_blank" rel="noopener noreferrer" className={`${roundLink} text-success`} aria-label="WhatsApp" title="WhatsApp">
                  <MessageCircle className="w-4 h-4 shrink-0 overflow-visible" />
                </a>
              </div>
            }
          />
        )}
        {vis.email && ws.email && (
          <InfoRow icon={Mail} label="Email" value={<a href={`mailto:${ws.email}`} className="hover:text-primary transition-colors">{ws.email}</a>} />
        )}
        {vis.website && ws.website && (
          <InfoRow
            icon={Globe}
            label="Website"
            value={ws.website}
            actions={
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className={`${roundLink} text-primary`} aria-label="Open website" title="Open website">
                <ExternalLink className="w-4 h-4 shrink-0 overflow-visible" />
              </a>
            }
          />
        )}
        {vis.address && fullAddress && <InfoRow icon={MapPin} label="Address" value={fullAddress} />}
      </div>
      {socials.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-3">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground w-full sm:w-auto">
            <Share2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            Connect with us
          </span>
          {icons}
        </div>
      )}
    </Card>
  );
}
