import { Instagram, Globe, Youtube, ExternalLink } from "lucide-react";

export default function QuotationSocialLinks({ socialLinks }) {
  if (!socialLinks) return null;

  const links = [
    { key: "instagram", label: "Instagram", icon: Instagram, url: socialLinks.instagram },
    { key: "website", label: "Website", icon: Globe, url: socialLinks.website },
    { key: "youtube", label: "YouTube", icon: Youtube, url: socialLinks.youtube }
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-foreground mb-3">Connect With Us</h2>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => {
          const Icon = l.icon;
          const href = l.url.startsWith("http") ? l.url : `https://${l.url}`;
          return (
            <a
              key={l.key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {l.label}
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          );
        })}
      </div>
    </div>
  );
}