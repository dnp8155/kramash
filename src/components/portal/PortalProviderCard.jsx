import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MessageCircle, Globe, Instagram, Youtube, ArrowUpRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { safeUrl } from "@/lib/publicSections";
import { Image } from "@/components/ui/image";
import { categoryLabel } from "@/lib/businessTerminology";
import { sanitizePhoneInput, whatsappNumber } from "@/lib/validation";

// "Your service provider" block on the client and team portals. When the business has switched its public
// profile on, it is a mini card (logo, name, tagline, quick call / WhatsApp / email, link to the full
// profile) built from the same public data as the /p/… page and honouring its show/hide choices. Without a
// public profile — or while it loads — it is the plain phone + email block.
export default function PortalProviderCard({ workspace, title = "Your Service Provider" }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let alive = true;
    setProfile(null);
    if (!workspace?.id) return undefined;
    (async () => {
      try {
        // Same server answer as the public page: only what the owner chose to show, never the whole record.
        const res = await base44.functions.invoke("getPublicProfile", { workspace_id: workspace.id });
        if (alive && res?.v === 2 && res.workspace?.slug) setProfile(res.workspace);
      } catch { /* the plain contact block stays */ }
    })();
    return () => { alive = false; };
  }, [workspace?.id]);

  const phone = workspace?.phone;
  const email = workspace?.email;

  if (!profile) {
    if (!phone && !email) return null;
    return (
      <div className="bg-card border border-border rounded-[15px] p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{`Contact ${title}`}</div>
        <div className="flex flex-wrap gap-4">
          {phone && <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary"><Phone className="w-3.5 h-3.5" /> {phone}</a>}
          {email && <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary"><Mail className="w-3.5 h-3.5" /> {email}</a>}
        </div>
      </div>
    );
  }

  const vis = profile.visibility || {};
  const showPhone = vis.phone !== false && !!(profile.phone || phone);
  const showEmail = vis.email !== false && !!(profile.email || email);
  const showSocial = vis.social !== false;
  const callNumber = profile.phone || phone;
  const mailTo = profile.email || email;
  const category = profile.business_category === "OTHER" && profile.custom_business_type ? profile.custom_business_type : categoryLabel(profile.business_category);
  const socials = showSocial ? [
    profile.social_links?.instagram && { url: safeUrl(profile.social_links.instagram), Icon: Instagram, label: "Instagram" },
    profile.social_links?.youtube && { url: safeUrl(profile.social_links.youtube), Icon: Youtube, label: "YouTube" },
    profile.website && { url: safeUrl(profile.website), Icon: Globe, label: "Website" },
  ].filter((x) => x && x.url) : [];

  const action = "h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors";

  return (
    <div className="bg-card border border-border rounded-[15px] p-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</div>
      <div className="flex items-start gap-3">
        {profile.logo ? (
          <Image src={profile.logo} alt={profile.name} fittingType="fit" className="w-12 h-12 rounded-xl border border-border object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0"><span className="text-primary-foreground text-lg font-bold">{(profile.name || "K").charAt(0).toUpperCase()}</span></div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground truncate">{profile.name}</div>
          {profile.tagline && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{profile.tagline}</p>}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {category && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{category}</span>}
            {profile.city && <span className="text-[11px] text-muted-foreground">{profile.city}</span>}
          </div>
        </div>
        <Link to={`/p/${profile.slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
          Profile <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {(showPhone || showEmail || socials.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-border">
          {showPhone && <a href={`tel:${sanitizePhoneInput(callNumber)}`} className={action}><Phone className="w-3.5 h-3.5 text-primary" /> Call</a>}
          {showPhone && <a href={`https://wa.me/${whatsappNumber(callNumber)}`} target="_blank" rel="noopener noreferrer" className={action}><MessageCircle className="w-3.5 h-3.5 text-success" /> WhatsApp</a>}
          {showEmail && <a href={`mailto:${mailTo}`} className={action}><Mail className="w-3.5 h-3.5 text-primary" /> Email</a>}
          {socials.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              {socials.map(({ url, Icon, label }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
