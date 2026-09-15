// AI-generated themed hero images for the Public Business Profile page.
// One image per business_category — picked based on the workspace's category.
// Generated once and stored as static URLs; not regenerated per page load.

export const PUBLIC_PROFILE_HEROES = {
  PHOTOGRAPHY: "https://media.base44.com/images/public/6aa198140e2903037c880386/3b371ccb6_generated_image.png",
  EVENT_MANAGEMENT: "https://media.base44.com/images/public/6aa198140e2903037c880386/f7f7a14b6_generated_image.png",
  ARCHITECTURE: "https://media.base44.com/images/public/6aa198140e2903037c880386/16c5a0e4d_generated_image.png",
  INTERIOR: "https://media.base44.com/images/public/6aa198140e2903037c880386/12e01af23_generated_image.png",
  SALON_BEAUTY: "https://media.base44.com/images/public/6aa198140e2903037c880386/32efbb27b_generated_image.png",
  CONSULTING: "https://media.base44.com/images/public/6aa198140e2903037c880386/c64dcccce_generated_image.png",
  AGENCY: "https://media.base44.com/images/public/6aa198140e2903037c880386/4b7028084_generated_image.png",
  CATERING: "https://media.base44.com/images/public/6aa198140e2903037c880386/21d97234c_generated_image.png",
  CONTRACTING: "https://media.base44.com/images/public/6aa198140e2903037c880386/5cb777c1e_generated_image.png",
  OTHER: "https://media.base44.com/images/public/6aa198140e2903037c880386/fa39d07b5_generated_image.png",
};

// Fallback for unknown / missing category
export const PUBLIC_PROFILE_HERO_DEFAULT = PUBLIC_PROFILE_HEROES.OTHER;

export function getPublicProfileHero(category) {
  if (!category) return PUBLIC_PROFILE_HERO_DEFAULT;
  return PUBLIC_PROFILE_HEROES[category] || PUBLIC_PROFILE_HERO_DEFAULT;
}