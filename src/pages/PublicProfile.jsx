import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { MapPin, Phone, Mail, Globe, Instagram, Facebook, Youtube, Sparkles } from "lucide-react";

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

  const { workspace: ws, socialLinks = {} } = data;

  const socials = [
    { key: "instagram", icon: Instagram, url: socialLinks.instagram },
    { key: "facebook", icon: Facebook, url: socialLinks.facebook },
    { key: "youtube", icon: Youtube, url: socialLinks.youtube },
    { key: "website", icon: Globe, url: socialLinks.website || ws.website }
  ].filter(s => s.url);

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero */}
      <div className="relative bg-gradient-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-30" />
        <div className="relative max-w-3xl mx-auto px-6 py-12 sm:py-16 text-center">
          {ws.logo ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden mx-auto mb-5 flex items-center justify-center">
              <Image src={ws.logo} alt={ws.name} className="w-full h-full object-cover" fittingType="fill" />
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mx-auto mb-5 flex items-center justify-center">
              <span className="text-3xl font-bold">{ws.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-heading font-bold mb-2">{ws.name}</h1>
          {ws.tagline && <p className="text-base sm:text-lg text-primary-foreground/80 max-w-xl mx-auto">{ws.tagline}</p>}
          {ws.business_type && (
            <span className="inline-block mt-4 px-3 py-1 rounded-full bg-white/10 text-xs font-medium border border-white/20">
              {ws.business_type}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* About */}
        {ws.about && (
          <section>
            <h2 className="text-lg font-heading font-semibold text-foreground mb-3">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{ws.about}</p>
          </section>
        )}

        {/* Contact */}
        <section>
          <h2 className="text-lg font-heading font-semibold text-foreground mb-3">Get in Touch</h2>
          <div className="bg-card border border-border rounded-xl p-5 shadow-card space-y-3">
            {ws.phone && (
              <a href={`tel:${ws.phone}`} className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" /> {ws.phone}
              </a>
            )}
            {ws.email && (
              <a href={`mailto:${ws.email}`} className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" /> {ws.email}
              </a>
            )}
            {ws.website && (
              <a href={ws.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" /> {ws.website}
              </a>
            )}
            {(ws.address || ws.city || ws.state) && (
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-anywhere">{[ws.address, ws.city, ws.state, ws.country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {socials.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                {socials.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.key}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <footer className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">Powered by Kramasha</p>
        </footer>
      </div>
    </div>
  );
}