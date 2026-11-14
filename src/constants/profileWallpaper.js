// Public profile header: the doodle icons drawn on the wallpaper for each business category, and each category's
// own header tint (used when the logo has no colour of its own). Icons are imported by name so only these ship.
import {
  Aperture, Apple, Armchair, AtSign, Award, Bath, BedDouble, Box, BrickWall, Briefcase, Building, Building2, Cake, Calculator, CalendarHeart, Camera, ChartLine, ChartPie, ChefHat, Clapperboard, ClipboardCheck, Coffee, Compass, Construction, Cookie, CookingPot, Croissant, Crown, DoorOpen, DraftingCompass, Drill, Droplets, EggFried, Factory, Feather, FileText, Film, Flag, Flame, Flower, Flower2, Focus, Frame, Gem, Gift, Glasses, Globe, Hammer, HandHeart, Handshake, HardHat, Hash, Heart, Hotel, House, Image, Images, Lamp, LampCeiling, Landmark, Layers, Leaf, Library, Lightbulb, Map, MapPin, Megaphone, MessagesSquare, Mic, Monitor, MousePointerClick, Music, PaintRoller, Paintbrush, Palette, PartyPopper, PenTool, PencilRuler, Pickaxe, Pizza, Presentation, Rocket, Ruler, Salad, Scale, Scissors, Share2, Shovel, Smartphone, Smile, Sofa, Soup, Sparkle, Sparkles, Speaker, SprayCan, Sprout, SquareDashed, Star, Sun, Target, Ticket, TrafficCone, TreePine, TrendingUp, Truck, Users, UtensilsCrossed, Video, Wine, Wrench, Zap,
} from "lucide-react";

export const PROFILE_DOODLES = {
  PHOTOGRAPHY: [Camera, Aperture, Image, Images, Film, Focus, Zap, Sun, Heart, Clapperboard, Video, Glasses, Flower2, Gem],
  EVENT_MANAGEMENT: [PartyPopper, Cake, Gift, Music, Mic, Ticket, Wine, Sparkles, Crown, Heart, Users, CalendarHeart, Speaker, Flower2],
  ARCHITECTURE: [Building2, Ruler, DraftingCompass, PencilRuler, House, Landmark, Factory, Hotel, SquareDashed, Layers, Box, Map, TreePine, DoorOpen],
  INTERIOR: [Sofa, Lamp, BedDouble, Armchair, Paintbrush, Palette, Sprout, LampCeiling, Bath, DoorOpen, Frame, Ruler, Library, Flower2],
  SALON_BEAUTY: [Scissors, Sparkles, Paintbrush, Flower, Heart, Gem, Crown, Smile, Droplets, SprayCan, Star, Feather, Sparkle, HandHeart],
  CONSULTING: [Briefcase, ChartLine, ChartPie, Target, Lightbulb, Users, Handshake, Presentation, ClipboardCheck, Calculator, TrendingUp, FileText, Scale, MessagesSquare],
  AGENCY: [Megaphone, PenTool, Palette, Monitor, Smartphone, Hash, AtSign, Rocket, Lightbulb, Image, Video, Share2, Globe, MousePointerClick],
  CATERING: [UtensilsCrossed, ChefHat, CookingPot, Soup, Wine, Cake, Croissant, Pizza, Salad, Coffee, Cookie, EggFried, Flame, Apple],
  CONTRACTING: [HardHat, Hammer, Wrench, Ruler, Truck, Drill, BrickWall, Construction, PaintRoller, TrafficCone, Pickaxe, Shovel, Building, Zap],
  OTHER: [Compass, Star, Sparkles, Heart, Lightbulb, Briefcase, MapPin, Smile, Rocket, Gift, Leaf, Coffee, Flag, Award],
};

export const PROFILE_TINTS = {
  "PHOTOGRAPHY": "#1b1a2e",
  "EVENT_MANAGEMENT": "#2b1722",
  "ARCHITECTURE": "#13242c",
  "INTERIOR": "#2b2118",
  "SALON_BEAUTY": "#2e1a26",
  "CONSULTING": "#15262a",
  "AGENCY": "#211736",
  "CATERING": "#2e1c12",
  "CONTRACTING": "#27241a",
  "OTHER": "#1c1b18"
};

export const DEFAULT_PROFILE_TINT = "#1c1b18";

export function doodlesFor(category) {
  return PROFILE_DOODLES[category] || PROFILE_DOODLES.OTHER;
}

export function tintFor(category) {
  return PROFILE_TINTS[category] || DEFAULT_PROFILE_TINT;
}
