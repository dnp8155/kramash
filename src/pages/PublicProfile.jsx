import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, Phone, Mail, Globe, Sparkles, Instagram, Youtube, Twitter, MessageCircle, ExternalLink } from "lucide-react";
import Card from "@/components/common/Card";
import ProfileWallpaper from "@/components/profile/ProfileWallpaper";
import { tintFor } from "@/constants/profileWallpaper";
import { headerColors } from "@/lib/profileWallpaper";
import { analyzeLogoFromUrl } from "@/lib/logoColor";
import { categoryLabel } from "@/lib/businessTerminology";
import { sanitizePhoneInput, whatsappNumber } from "@/lib/validation";
import { EXTRA_SOCIAL_ICON_OPTIONS, SOCIAL_BRAND_COLORS } from "@/lib/socialIcons";
import useSEO from "@/hooks/useSEO";

function safeJson(str, fallback = {}) {
  if (!str) return fallback;
  if (typeof str === "object") return str;
  try { return JSON.parse(str); } catch { return fallback; }
}

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

export default function PublicProfile() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: workspaces, error: queryError } = await supabase
          .from("workspaces")
          .select("*")
          .eq("public_profile_slug", slug)
          .eq("public_profile_enabled", true)
          .order("created_at", { ascending: false })
          .limit(1);

        if (queryError) throw queryError;
        const workspace = workspaces?.[0];
        if (!workspace) {
          setError(true);
          return;
        }

        const dp = safeJson(workspace.display_preferences, {});
        const visibility = {
          phone: dp.public_show_phone !== false,
          email: dp.public_show_email !== false,
          address: dp.public_show_address !== false,
          website: dp.public_show_website !== false,
          social: dp.public_show_social !== false,
        };
        const social_links = {
          instagram: dp.social_instagram || "",
          youtube: dp.social_youtube || "",
          website: workspace.website || "",
          twitter: dp.social_twitter || dp.social_portfolio || "",
          extra: Array.isArray(dp.social_extra) ? dp.social_extra.slice(0, 2) : [],
        };

        setData({
          workspace: {
            name: workspace.name,
            tagline: workspace.tagline || "",
            logo: workspace.logo || "",
            business_category: workspace.business_category || "OTHER",
            business_type: workspace.business_type || "",
            custom_business_type: workspace.custom_business_type || "",
            about: workspace.public_profile_about || "",
            address: workspace.address || "",
            city: workspace.city || "",
            state: workspace.state || "",
            country: workspace.country || "",
            phone: workspace.phone || "",
            email: workspace.email || "",
            website: workspace.website || "",
            social_links,
            visibility,
          },
        });
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (slug) load();
  }, [slug]);

  // Dynamic SEO based on business profile data
  const wsData = data?.workspace;
  useSEO({
    title: wsData ? `${wsData.name} — ${wsData.tagline || "Creative Business on Kramasha"}` : "Business Profile — Kramasha",
    description: wsData
      ? `${wsData.name}${wsData.tagline ? ` — ${wsData.tagline}` : ""}. ${wsData.about ? wsData.about.substring(0, 120) : "Creative business on Kramasha, the all-in-one business management platform for photographers, event managers and studios in India."}${wsData.city ? ` Located in ${wsData.city}.` : ""}`
      : "Discover creative businesses on Kramasha — the all-in-one business management platform for photographers, event managers, studios and creative businesses in India.",
    keywords: wsData
      ? `${wsData.name}, ${wsData.business_category || "creative business"}, ${wsData.city || ""} business, photography studio, event management, creative business India, Kramasha profile`
      : "creative business profile India, photography studio profile, event management company profile, creative business directory India",
    image: wsData?.logo,
    path: `/p/${slug || ""}`,
    ogType: "profile",
    jsonLd: wsData ? {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: wsData.name,
      description: wsData.about || wsData.tagline || "Creative business on Kramasha",
      url: `https://www.kramasha.com/p/${slug}`,
      image: wsData.logo,
      email: wsData.email,
      telephone: wsData.phone,
      address: wsData.address || wsData.city ? {
        "@type": "PostalAddress",
        streetAddress: wsData.address,
        addressLocality: wsData.city,
        addressRegion: wsData.state,
        addressCountry: wsData.country || "IN",
      } : undefined,
      sameAs: [
        wsData.social_links?.instagram, wsData.social_links?.youtube,
        wsData.social_links?.twitter, wsData.social_links?.website,
        ...(wsData.social_links?.extra || []).map((s) => s.url),
      ].filter(Boolean),
    } : undefined,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: wsData?.name || "Business Profile", url: `/p/${slug || ""}` },
    ],
  });

  // Header colour follows the logo. Read in the browser; a logo that can't be read (or has no colour) keeps the category tint.
  const [logoInfo, setLogoInfo] = useState({ color: null, tone: null });
  const logoUrl = wsData?.logo || "";
  useEffect(() => {
    let alive = true;
    setLogoInfo({ color: null, tone: null });
    if (logoUrl) analyzeLogoFromUrl(logoUrl).then((r) => { if (alive) setLogoInfo(r); });
    return () => { alive = false; };
  }, [logoUrl]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Profile Not Available</h1>
          <p className="text-sm text-muted-foreground">
            This business profile is either not published or no longer available.
          </p>
        </div>
      </div>
    );
  }

  const ws = data.workspace;
  const vis = ws.visibility || {};
  const colors = headerColors(logoInfo.color, tintFor(ws.business_category), logoInfo.tone);
  const categoryText = ws.business_category === "OTHER" && ws.custom_business_type ? ws.custom_business_type : categoryLabel(ws.business_category);

  // Build social links list (only non-empty + if visible)
  const socials = [];
  if (vis.social !== false) {
    if (ws.social_links?.instagram) socials.push({ url: ws.social_links.instagram, Icon: Instagram, label: "Instagram", key: "instagram" });
    if (ws.social_links?.youtube) socials.push({ url: ws.social_links.youtube, Icon: Youtube, label: "YouTube", key: "youtube" });
    if (ws.social_links?.twitter) socials.push({ url: ws.social_links.twitter, Icon: Twitter, label: "Twitter / X", key: "twitter" });
    if (ws.social_links?.website) socials.push({ url: ws.social_links.website, Icon: Globe, label: "Website", key: "website" });
    (ws.social_links?.extra || []).forEach((s, i) => {
      if (!s.url) return;
      const opt = EXTRA_SOCIAL_ICON_OPTIONS.find((o) => o.v === s.icon) || EXTRA_SOCIAL_ICON_OPTIONS[0];
      socials.push({ url: s.url, Icon: opt.Icon, label: opt.l, key: opt.v });
    });
  }

  const fullAddress = [ws.address, ws.city, ws.state, ws.country].filter(Boolean).join(", ");
  const hasContact = !!((vis.phone && ws.phone) || (vis.email && ws.email) || (vis.website && ws.website) || (vis.address && fullAddress));
  const websiteUrl = /^https?:\/\//i.test(ws.website || "") ? ws.website : `https://${ws.website || ""}`;

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero — doodle wallpaper of the business's category, coloured from its logo */}
      <div className="relative w-full overflow-hidden isolate transition-colors duration-500" style={{ backgroundColor: colors.bg, color: colors.text }}>
        <ProfileWallpaper category={ws.business_category} glow={colors.glow} glowSoft={colors.glowSoft} stroke={colors.doodle} opacity={colors.doodleOpacity} glowOpacity={colors.glowOpacity} motion="random" />
        {/* Soft shade behind the middle so the name and tagline always read cleanly */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: colors.scrim }} />

        {/* Hero content */}
        <div className="relative max-w-5xl mx-auto px-6 pt-10 pb-9 sm:pt-14 sm:pb-12 flex flex-col items-center text-center gap-3.5">
          {/* Solid light plate: any logo (dark, light or transparent) stays clearly visible */}
          <div className="w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] rounded-[22px] ring-2 overflow-hidden flex items-center justify-center" style={{ backgroundColor: colors.plate, color: colors.plateInk, "--tw-ring-color": colors.ring, boxShadow: colors.plateShadow }}>
            {ws.logo && !logoError ? (
              <img
                src={ws.logo}
                alt={ws.name}
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-3xl font-bold font-heading">{ws.name?.charAt(0)?.toUpperCase()}</span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold tracking-tight text-balance" style={{ textShadow: colors.shadowTitle }}>{ws.name}</h1>
          {ws.tagline && (
            <p className="text-sm sm:text-base max-w-xl text-balance" style={{ color: colors.textSoft, textShadow: colors.shadowText }}>{ws.tagline}</p>
          )}
          {categoryText && (
            <span className="inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold tracking-wide" style={{ backgroundColor: colors.chipBg, borderColor: colors.chipBorder }}>{categoryText}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* About */}
        {ws.about && (
          <section className="text-center max-w-2xl mx-auto">
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{ws.about}</p>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Contact — same card, title and row styles as the rest of the app (e.g. Client details) */}
          {hasContact && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Get in Touch</h2>
              <div className="space-y-4">
                {vis.phone && ws.phone && (
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    value={ws.phone}
                    actions={
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:${sanitizePhoneInput(ws.phone)}`}
                          className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-primary hover:bg-muted transition-colors"
                          aria-label="Call"
                          title="Call"
                        >
                          <Phone className="w-4 h-4 shrink-0 overflow-visible" />
                        </a>
                        <a
                          href={`https://wa.me/${whatsappNumber(ws.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-success hover:bg-muted transition-colors"
                          aria-label="WhatsApp"
                          title="WhatsApp"
                        >
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
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-primary hover:bg-muted transition-colors shrink-0"
                        aria-label="Open website"
                        title="Open website"
                      >
                        <ExternalLink className="w-4 h-4 shrink-0 overflow-visible" />
                      </a>
                    }
                  />
                )}
                {vis.address && fullAddress && <InfoRow icon={MapPin} label="Address" value={fullAddress} />}
              </div>
            </Card>
          )}

          {/* Social links */}
          {socials.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Connect with Us</h2>
              <div className="flex flex-wrap items-center gap-2.5">
                {socials.map(({ url, Icon, label, key }) => {
                  const brand = SOCIAL_BRAND_COLORS[key];
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      style={brand ? { color: brand } : undefined}
                      className={`w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors ${brand ? "" : "text-foreground"}`}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0 overflow-visible" />
                    </a>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        <footer className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">{ws.name} • Kramasha</p>
        </footer>
      </div>
    </div>
  );
}