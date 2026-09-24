import { useReducedMotion as framerUseReducedMotion } from "framer-motion";

// Gentle ease-out — professional, non-bouncy
export const EASE = [0.16, 1, 0.3, 1];

// Centralized durations (seconds) — short and fast
export const DURATION = 0.2;
export const DURATION_FAST = 0.15;
export const STAGGER = 0.04;

// Page transition — fade + subtle slide
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

// Stagger container — orchestrates children entrance
export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: STAGGER, delayChildren: 0.02 },
  },
};

// Stagger item — fade + slide up
export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// Scale-in — for dropdowns and popovers
export const scaleInVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

// Card entrance
export const cardEntrance = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export const useReducedMotion = framerUseReducedMotion;