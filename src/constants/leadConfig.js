import { Flame, TrendingUp, Target, Users, Share2, Globe, Footprints, Megaphone, HelpCircle } from "lucide-react";

// Shared by the Leads page, the pipeline board, the insights view and the lead dialogs.

export const LEAD_STATUSES = ["new", "contacted", "qualified", "negotiation", "won", "lost"];

export const STATUS_STYLES = {
  new: { bg: "bg-blue-50", text: "text-blue-700", label: "New" },
  contacted: { bg: "bg-purple-50", text: "text-purple-700", label: "Contacted" },
  qualified: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Qualified" },
  negotiation: { bg: "bg-amber-50", text: "text-amber-700", label: "Negotiation" },
  won: { bg: "bg-green-50", text: "text-green-700", label: "Won" },
  lost: { bg: "bg-red-50", text: "text-red-700", label: "Lost" },
};

export const PRIORITY_STYLES = {
  hot: { icon: Flame, color: "text-red-600", bg: "bg-red-50", label: "Hot" },
  warm: { icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", label: "Warm" },
  cold: { icon: Target, color: "text-blue-600", bg: "bg-blue-50", label: "Cold" },
};

export const SOURCE_STYLES = {
  referral: { icon: Users, color: "text-purple-600", bg: "bg-purple-50", label: "Referral" },
  social_media: { icon: Share2, color: "text-pink-600", bg: "bg-pink-50", label: "Social Media" },
  website: { icon: Globe, color: "text-blue-600", bg: "bg-blue-50", label: "Website" },
  walk_in: { icon: Footprints, color: "text-teal-600", bg: "bg-teal-50", label: "Walk-in" },
  advertisement: { icon: Megaphone, color: "text-orange-600", bg: "bg-orange-50", label: "Advertisement" },
  other: { icon: HelpCircle, color: "text-gray-600", bg: "bg-gray-50", label: "Other" },
};

// Why a lead was lost — picked when a lead is moved to Lost, used by the pipeline summary.
export const LOST_REASONS = [
  { value: "price", label: "Price too high" },
  { value: "date_unavailable", label: "Date not available" },
  { value: "chose_other", label: "Chose someone else" },
  { value: "no_response", label: "No response" },
  { value: "not_a_fit", label: "Not a fit" },
  { value: "other", label: "Other" },
];

// Ready-to-send messages. Placeholders: {name} {business} {event} {date}. Parts in [[ ]] are dropped when the
// lead has no event type / date, so the sentence still reads naturally.
export const MESSAGE_TEMPLATES = [
  { key: "intro", label: "Thanks for your enquiry", text: "Hi {name}, thank you for reaching out to {business}! We'd love to help[[ with your {event}]][[ on {date}]]. When would be a good time to talk?" },
  { key: "followup", label: "Follow-up", text: "Hi {name}, just following up on your enquiry[[ about your {event}]]. Do you have any questions I can help with? — {business}" },
  { key: "available", label: "Date is available", text: "Hi {name}, good news — we're available[[ on {date}]][[ for your {event}]]. Shall I send over the details and a quotation? — {business}" },
  { key: "unavailable", label: "Date is not available", text: "Hi {name}, thank you for thinking of us. Unfortunately we're not available[[ on {date}]]. If you have another date in mind, let me know and I'll check right away. — {business}" },
  { key: "quotation", label: "Quotation sent", text: "Hi {name}, I've shared the quotation[[ for your {event}]]. Please have a look and tell me what you think — happy to adjust anything. — {business}" },
];

export const ACTIVITY_KINDS = {
  note: { label: "Note" },
  call: { label: "Call" },
  whatsapp: { label: "WhatsApp" },
  status: { label: "Status" },
  followup: { label: "Follow-up" },
};
