import { Instagram, Globe, Youtube, ExternalLink } from "lucide-react";

export default function QuotationSocialSection({ workspace }) {
  if (!workspace) return null;
  const links = [];
  if (workspace.social_instagram) links.push({ icon: Instagram, label: "Instagram", url: workspace.social_instagram });
  if (workspace.social_website) links.push({ icon: Globe, label: "Website", url: workspace.social_website });
  if (workspace.social_youtube) links.push({ icon: Youtube, label: "YouTube", url: workspace.social_youtube });
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {links.map((link) => {
        const Icon = link.icon;
        const href = link.url.startsWith("http") ? link.url : `https://${link.url}`;
        return (
          <a
            key={link.label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Icon className="h-3.5 w-3.5" /> {link.label}
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}