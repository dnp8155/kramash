import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { base44 } from "@/api/base44Client";
import { Send, MapPin, Phone, Mail, Globe, Sparkles, Instagram, Youtube, Twitter, MessageCircle, ExternalLink, Info, BarChart3, Contact, Share2 } from "lucide-react";
import Card from "@/components/common/Card";
import ProfileWallpaper from "@/components/profile/ProfileWallpaper";
import { tintFor } from "@/constants/profileWallpaper";
import { headerColors } from "@/lib/profileWallpaper";
import { analyzeLogoFromUrl } from "@/lib/logoColor";
import { categoryLabel, getBusinessTerminology } from "@/lib/businessTerminology";
import { sanitizePhoneInput, whatsappNumber } from "@/lib/validation";
import { EXTRA_SOCIAL_ICON_OPTIONS, SOCIAL_BRAND_COLORS } from "@/lib/socialIcons";
import useSEO from "@/hooks/useSEO";
import { safeUrl } from "@/lib/publicSections";
import PublicSections from "@/components/publicpage/PublicSections";
import InquiryForm from "@/components/publicpage/InquiryForm";
import CardTitle from "@/components/publicpage/CardTitle";

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
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Preferred: the server returns only what the owner chose to show (hidden contact details never leave it).
        // Until the updated getPublicProfile is deployed (it answers with v: 2), fall back to reading the row directly.
        try {
          const res = await base44.functions.invoke("getPublicProfile", { slug });
          if (res?.v === 2 && res.workspace) { setData({ stats: res.stats || null, workspace: res.workspace }); return; }
        } catch { /* not deployed yet, or not found: use the direct read below */ }

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

        // Counts come from a server function that only returns the stats the owner switched on.
        let stats = null;
        try {
          const { data: s, error: statsError } = await supabase.rpc("get_public_profile_stats", { p_slug: slug });
          if (statsError) console.warn("[PublicProfile] stats unavailable:", statsError.message);
          stats = s || null;
        } catch { /* stats are optional */ }

        setData({
          stats,
          workspace: {
            custom_work_label_singular: workspace.custom_work_label_singular || "",
            custom_work_label_plural: workspace.custom_work_label_plural || "",
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
            sections: dp.public_sections,
            inquiry: dp.public_inquiry_enabled === true,
          },
        });
      } catch {
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
    (ws.social_links?.extra || []).forEach((s) => {
      if (!s.url) return;
      const opt = EXTRA_SOCIAL_ICON_OPTIONS.find((o) => o.v === s.icon) || EXTRA_SOCIAL_ICON_OPTIONS[0];
      socials.push({ url: s.url, Icon: opt.Icon, label: opt.l, key: opt.v });
    });
  }

  // Stat labels follow the business type (e.g. "Projects completed", "Events completed").
  const term = getBusinessTerminology(ws);
  const statItems = [
    { key: "clients", value: data.stats?.clients, label: "Clients served" },
    { key: "works", value: data.stats?.works, label: `${term.workItemPlural} completed` },
    { key: "team", value: data.stats?.team, label: "Team members" },
  ].filter((s) => Number.isFinite(Number(s.value)) && s.value !== null && Number(s.value) > 0);

  const fullAddress =[ws.address, ws.city, ws.state, ws.country].filter(Boolean).join(", ");
  const hasContact = !!((vis.phone && ws.phone) || (vis.email && ws.email) || (vis.website && ws.website) || (vis.address && fullAddress));
  const websiteUrl = /^https?:\/\//i.test(ws.website || "") ? ws.website : `https://${ws.website || ""}`;

  // Phones open the share sheet; where there is none (most desktops) the link is copied instead.
  const shareProfile = async () => {
    const url = `${window.location.origin}/p/${slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: ws.name, text: ws.tagline || ws.name, url }); return; }
    } catch (e) { if (e?.name === "AbortError") return; }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch { window.prompt("Copy this link", url); }
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero — doodle wallpaper of the business's category, coloured from its logo */}
      <div className="relative w-full overflow-hidden isolate transition-colors duration-500" style={{ backgroundColor: colors.bg, color: colors.text }}>
        <ProfileWallpaper category={ws.business_category} glow={colors.glow} glowSoft={colors.glowSoft} stroke={colors.doodle} opacity={colors.doodleOpacity} glowOpacity={colors.glowOpacity} motion="random" />
        {/* Soft shade behind the middle so the name and tagline always read cleanly */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: colors.scrim }} />

        {/* Share: small round icon in the corner, clear of the centred logo, name and inquiry button */}
        <div className="absolute z-10 top-3 right-3 sm:top-4 sm:right-5 flex items-center gap-2">
          {linkCopied && <span role="status" className="px-2.5 py-1 rounded-full border text-xs font-semibold animate-in fade-in" style={{ backgroundColor: colors.chipBg, borderColor: colors.chipBorder }}>Link copied</span>}
          <button
            type="button"
            onClick={shareProfile}
            aria-label="Share this page"
            title="Share"
            className="w-9 h-9 rounded-full border flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: colors.chipBg, borderColor: colors.chipBorder, color: "inherit" }}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

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

      {/* "Send an inquiry" sits on the seam between the header and the body, half on each */}
      {ws.inquiry && (
        <div className="relative z-10 h-0 flex items-start justify-center px-4">
          <a
            href="#inquiry"
            onClick={(e) => { e.preventDefault(); document.getElementById("inquiry")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            className="-translate-y-1/2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: colors.text, color: colors.bg }}
          >
            <Send className="w-4 h-4" /> Send an inquiry
          </a>
        </div>
      )}

      {/* Body */}
      {/* With the inquiry button on the seam, half of it (about 18px) hangs into the body: add that much so the first card keeps its usual 32px gap below the button */}
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 pb-8 space-y-8 ${ws.inquiry ? "pt-[3.125rem]" : "pt-8"}`}>
        {/* About */}
        {ws.about && (
          <Card className="p-5">
            <CardTitle icon={Info}>About Us</CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">{ws.about}</p>
          </Card>
        )}

        {statItems.length > 0 && (
          <Card className="p-5">
            <CardTitle icon={BarChart3}>At a Glance</CardTitle>
            <div className="grid divide-x divide-border" style={{ gridTemplateColumns: `repeat(${statItems.length}, minmax(0, 1fr))` }}>
              {statItems.map((s) => (
                <div key={s.key} className="px-2 sm:px-4 text-center first:pl-0 last:pr-0">
                  <div className="text-2xl sm:text-3xl font-bold font-heading text-foreground tabular-nums">{Number(s.value).toLocaleString("en-IN")}</div>
                  <div className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground leading-snug">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <PublicSections sections={ws.sections} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Contact — same card, title and row styles as the rest of the app (e.g. Client details) */}
          {hasContact && (
            <Card className="p-5">
              <CardTitle icon={Contact}>Get in Touch</CardTitle>
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
              <CardTitle icon={Share2}>Connect with Us</CardTitle>
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

        {ws.inquiry && <InquiryForm slug={slug} workspace={ws} />}

        <footer className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} - {ws.name}, powered by{" "}
            <a href="/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline">Kramasha</a>
          </p>
        </footer>
      </div>
    </div>
  );
}