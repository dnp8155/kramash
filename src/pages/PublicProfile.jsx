import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { MapPin, Phone, Mail, Globe, Sparkles, Instagram, Youtube, Link as LinkIcon } from "lucide-react";
import { getPublicProfileHero } from "@/constants/publicProfileHeroes";

export default function PublicProfile() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await base44.functions.invoke("getPublicProfile", { slug });
        if (res?.data?.workspace) {
          setData(res.data);
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (slug) load();
  }, [slug]);

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
  const heroImage = getPublicProfileHero(ws.business_category);

  // Build social links list (only non-empty + if visible)
  const socials = [];
  if (vis.social !== false) {
    if (ws.social_links?.instagram) socials.push({ url: ws.social_links.instagram, Icon: Instagram, label: "Instagram" });
    if (ws.social_links?.youtube) socials.push({ url: ws.social_links.youtube, Icon: Youtube, label: "YouTube" });
    if (ws.social_links?.website) socials.push({ url: ws.social_links.website, Icon: Globe, label: "Website" });
    if (ws.social_links?.portfolio) socials.push({ url: ws.social_links.portfolio, Icon: LinkIcon, label: "Portfolio" });
  }

  const fullAddress = [ws.address, ws.city, ws.state, ws.country].filter(Boolean).join(", ");

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero — full-bleed category image with dark scrim */}
      <div className="relative w-full h-64 sm:h-80 lg:h-96 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt={ws.name}
            className="w-full h-full"
            fittingType="fill"
          />
        </div>
        {/* Dark scrim gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/45 to-black/65" />

        {/* Hero content */}
        <div className="relative h-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center text-white">
          {ws.logo ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Image src={ws.logo} alt={ws.name} className="w-full h-full" fittingType="fill" />
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mx-auto mb-4 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold">{ws.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold mb-2 drop-shadow-md">{ws.name}</h1>
          {ws.tagline && (
            <p className="text-sm sm:text-lg text-white/85 max-w-xl mx-auto drop-shadow-sm">{ws.tagline}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact */}
          {(vis.phone || vis.email || vis.website || vis.address) && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-foreground mb-3">Get in Touch</h2>
              <div className="bg-card border border-border rounded-xl p-5 shadow-card space-y-3">
                {vis.phone && ws.phone && (
                  <a href={`tel:${ws.phone}`} className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" /> {ws.phone}
                  </a>
                )}
                {vis.email && ws.email && (
                  <a href={`mailto:${ws.email}`} className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" /> {ws.email}
                  </a>
                )}
                {vis.website && ws.website && (
                  <a href={ws.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors break-anywhere">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" /> {ws.website}
                  </a>
                )}
                {vis.address && fullAddress && (
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-anywhere">{fullAddress}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Social Links */}
          {socials.length > 0 && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-foreground mb-3">Follow Us</h2>
              <div className="bg-card border border-border rounded-xl p-5 shadow-card">
                <div className="flex flex-wrap gap-3">
                  {socials.map(({ url, Icon, label }) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-11 h-11 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all hover-lift"
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <footer className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">{ws.name} • Kramasha</p>
        </footer>
      </div>
    </div>
  );
}