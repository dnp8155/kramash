import { Instagram, Youtube, Facebook, Twitter, Linkedin, Globe, Link as LinkIcon, MessageCircle, Music2, Phone, Mail } from "lucide-react";

export function detectSocialPlatform(url) {
  if (!url || !url.trim()) return null;
  const u = url.toLowerCase().trim();
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("facebook.com") || u.includes("fb.com") || u.includes("fb.me")) return "facebook";
  if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("wa.me") || u.includes("whatsapp.com") || u.includes("whatsapp://")) return "whatsapp";
  if (u.startsWith("tel:")) return "phone";
  if (u.startsWith("mailto:")) return "email";
  if (u.startsWith("http") || u.includes(".")) return "website";
  return "link";
}

export const SOCIAL_ICONS = {
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  tiktok: Music2,
  whatsapp: MessageCircle,
  website: Globe,
  link: LinkIcon,
  phone: Phone,
  email: Mail,
};

export function getSocialIcon(url) {
  const platform = detectSocialPlatform(url);
  if (!platform) return null;
  return SOCIAL_ICONS[platform] || LinkIcon;
}

// Icon choices offered when a user adds a custom/extra social link (workspace
// preferences and per-quotation snapshots) — kept in one place so every editor
// offers the same set.
export const EXTRA_SOCIAL_ICON_OPTIONS = [
  { v: "facebook", l: "Facebook", Icon: Facebook },
  { v: "linkedin", l: "LinkedIn", Icon: Linkedin },
  { v: "tiktok", l: "TikTok", Icon: Music2 },
  { v: "whatsapp", l: "WhatsApp", Icon: MessageCircle },
  { v: "other", l: "Other", Icon: LinkIcon },
];