import PublicFooter from "@/components/common/PublicFooter";
import UnavailableScreen from "@/components/common/UnavailableScreen";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { base44 } from "@/api/base44Client";
import { Send, Globe, Instagram, Youtube, Twitter, Info, BarChart3, Share2 } from "lucide-react";
import Card from "@/components/common/Card";
import ProfileWallpaper from "@/components/profile/ProfileWallpaper";
import { tintFor } from "@/constants/profileWallpaper";
import { headerColors } from "@/lib/profileWallpaper";
import { analyzeLogoFromUrl } from "@/lib/logoColor";
import { categoryLabel, getBusinessTerminology, inferCategoryFromType } from "@/lib/businessTerminology";
import { EXTRA_SOCIAL_ICON_OPTIONS } from "@/lib/socialIcons";
import useSEO from "@/hooks/useSEO";
import PublicSections from "@/components/publicpage/PublicSections";
import InquiryForm from "@/components/publicpage/InquiryForm";
import AppLoadingScreen from "@/components/common/AppLoadingScreen";
import FadeImg from "@/components/common/FadeImg";
import CardTitle from "@/components/publicpage/CardTitle";
import ContactCard from "@/components/publicpage/ContactCard";

function safeJson(str, fallback = {}) {
  if (!str) return fallback;
  if (typeof str === "object") return str;
  try { return JSON.parse(str); } catch { return fallback; }
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
          if (res?.v === 2 && res.workspace) {
            // The older server answered "OTHER" for a profile with no category set, hiding what its business type says (an architect's "Architect").
            const w = res.workspace;
            const category = w.business_category && w.business_category !== "OTHER" ? w.business_category : inferCategoryFromType(w.business_type);
            setData({ stats: res.stats || null, workspace: { ...w, business_category: category, instagram: res.instagram || null } });
            return;
          }
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
            business_category: workspace.business_category || "",
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
    // Visitors see Kramasha's own branded loading screen (logo, wordmark) while the profile is fetched.
    return <AppLoadingScreen label="Loading profile…" />;
  }

  if (error || !data) {
    return (
      <UnavailableScreen
        title="Profile Not Available"
        message="This business profile is either not published or no longer available."
      />
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
      // Most apps (WhatsApp, Messages…) ignore `title` and paste only `text` + link, so the name goes into the text too.
      if (navigator.share) { await navigator.share({ title: ws.name, text: ws.tagline ? `${ws.name} — ${ws.tagline}` : ws.name, url }); return; }
    } catch (e) { if (e?.name === "AbortError") return; }
    try {
      await navigator.clipboard.writeText(`${ws.name}${ws.tagline ? ` — ${ws.tagline}` : ""}\n${url}`);
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
              <FadeImg
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

        <PublicSections sections={ws.sections} instagram={ws.instagram} />

        <ContactCard ws={ws} vis={vis} fullAddress={fullAddress} websiteUrl={websiteUrl} socials={socials} hasContact={hasContact} />

        {ws.inquiry && <InquiryForm slug={slug} workspace={ws} />}

        <PublicFooter name={ws.name} />
      </div>
    </div>
  );
}