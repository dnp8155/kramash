import { Instagram, Youtube, Facebook, Twitter, Linkedin, Globe, Link as LinkIcon, MessageCircle, Phone, Mail } from "lucide-react";

export function detectSocialPlatform(url) {
  if (!url || !url.trim()) return null;
  const u = url.toLowerCase().trim();
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("facebook.com") || u.includes("fb.com") || u.includes("fb.me")) return "facebook";
  if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  if (u.includes("linkedin.com")) return "linkedin";
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