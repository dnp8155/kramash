import { useState } from "react";
import { Play, ExternalLink, Quote, ChevronDown, MapPin, Video, Briefcase, MessageSquareQuote, Link2, HelpCircle, FileText, Instagram } from "lucide-react";
import Card from "@/components/common/Card";
import CardTitle from "./CardTitle";
import { cn } from "@/lib/utils";
import { publicSections, parseVideoUrl, parseMapUrl, videoThumb, videoEmbed, safeUrl } from "@/lib/publicSections";

const SECTION_ICONS = { videos: Video, map: MapPin, services: Briefcase, testimonials: MessageSquareQuote, links: Link2, faq: HelpCircle, text: FileText, instagram: Instagram };

function VideoTile({ item }) {
  const [playing, setPlaying] = useState(false);
  const v = parseVideoUrl(item.url);
  if (!v) return null;
  const thumb = videoThumb(v);
  return (
    <div>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted border border-border">
        {playing ? (
          <iframe
            src={videoEmbed(v)}
            title={item.title || "Video"}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="absolute inset-0 w-full h-full group" aria-label={`Play ${item.title || "video"}`}>
            {thumb && <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />}
            <span className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-white/95 text-black flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Play className="w-6 h-6 ml-0.5 fill-current" />
              </span>
            </span>
          </button>
        )}
      </div>
      {item.title && <p className="text-sm font-medium text-foreground mt-2 break-words">{item.title}</p>}
    </div>
  );
}

function MapTile({ item }) {
  const m = parseMapUrl(item.url);
  if (!m) return null;
  return (
    <div>
      {m.embed ? (
        <div className={cn("relative w-full rounded-xl overflow-hidden bg-muted border border-border", item.size === "small" ? "h-40 sm:h-48" : "h-72 sm:h-96")}>
          <iframe src={m.embed} title={item.title || "Map"} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen className="absolute inset-0 w-full h-full border-0" />
        </div>
      ) : null}
      <div className={cn("flex items-center gap-3", item.title ? "justify-between" : "justify-end", m.embed ? "mt-2.5" : "border border-border rounded-xl p-4")}>
        {item.title && (
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground break-words">{item.title}</span>
          </div>
        )}
        <a href={m.open} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0">Open in Google Maps <ExternalLink className="w-3.5 h-3.5" /></a>
      </div>
    </div>
  );
}

// The latest photos from the owner's connected Instagram (read by the server; the browser never sees a token).
function InstagramGrid({ data }) {
  const photos = data?.photos || [];
  const username = String(data?.username || "").replace(/[^\w.]/g, "");
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {photos.map((p) => (
          <a key={p.id} href={safeUrl(p.link)} target="_blank" rel="noopener noreferrer" className="relative block aspect-square overflow-hidden rounded-lg bg-muted border border-border group">
            <img src={p.url} alt={p.alt || "Instagram photo"} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </a>
        ))}
      </div>
      {username && (
        <a href={`https://www.instagram.com/${username}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary hover:underline">
          Follow @{username} on Instagram <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="text-sm font-medium text-foreground break-words">{item.q}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">{item.a}</p>}
    </div>
  );
}

function Body({ section, instagram }) {
  const { type, items } = section;
  if (type === "instagram") return <InstagramGrid data={instagram} />;
  if (type === "videos") {
    return <div className={cn("grid gap-4", items.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-2xl")}>{items.map((it, i) => <VideoTile key={i} item={it} />)}</div>;
  }
  if (type === "map") {
    return (
      <div className="space-y-5">
        {items.map((it, i) => <MapTile key={i} item={it} />)}
      </div>
    );
  }
  if (type === "services") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it, i) => (
          <div key={i} className="border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground break-words">{it.title}</h3>
              {it.price && <span className="text-xs font-semibold text-primary whitespace-nowrap">{it.price}</span>}
            </div>
            {it.description && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line break-words">{it.description}</p>}
          </div>
        ))}
      </div>
    );
  }
  if (type === "testimonials") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it, i) => (
          <figure key={i} className="border border-border rounded-xl p-4">
            <Quote className="w-4 h-4 text-primary/60 mb-2" />
            <blockquote className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words">{it.quote}</blockquote>
            {it.name && <figcaption className="text-xs text-muted-foreground mt-2.5">— {it.name}</figcaption>}
          </figure>
        ))}
      </div>
    );
  }
  if (type === "links") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it, i) => (
          <a key={i} href={safeUrl(it.url)} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-3 border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground break-words">{it.title}</div>
              {it.note && <div className="text-xs text-muted-foreground mt-0.5 break-words">{it.note}</div>}
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          </a>
        ))}
      </div>
    );
  }
  if (type === "faq") return <div className="space-y-2">{items.map((it, i) => <FaqItem key={i} item={it} />)}</div>;
  return <div className="space-y-3">{items.map((it, i) => <p key={i} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">{it.body}</p>)}</div>;
}

// The owner's chosen blocks, in order. Empty or hidden sections never render.
export default function PublicSections({ sections, instagram }) {
  // The Instagram section only shows when the server sent photos for it.
  const list = publicSections(sections).filter((s) => s.type !== "instagram" || instagram?.photos?.length);
  if (list.length === 0) return null;
  return (
    <>
      {list.map((s) => (
        <Card key={s.id} className="p-5">
          {s.title && <CardTitle icon={SECTION_ICONS[s.type] || FileText}>{s.title}</CardTitle>}
          <Body section={s} instagram={instagram} />
        </Card>
      ))}
    </>
  );
}
