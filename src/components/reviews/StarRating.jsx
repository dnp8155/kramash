import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

const SIZES = { xs: "w-3 h-3", sm: "w-3.5 h-3.5", md: "w-4 h-4", lg: "w-8 h-8" };

// Read-only stars (1–5). Filled ones are amber, the rest are a soft outline.
export function Stars({ value = 0, size = "sm", className }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn(SIZES[size] || SIZES.sm, i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </span>
  );
}

// Tap-to-pick stars for the client. Hover previews on desktop; each star springs when picked.
export function StarPicker({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= shown;
        return (
          <motion.button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} ${i === 1 ? "star" : "stars"}`}
            disabled={disabled}
            onMouseEnter={() => !disabled && setHover(i)}
            onClick={() => !disabled && onChange(i)}
            whileTap={{ scale: 0.8 }}
            animate={{ scale: value === i ? [1, 1.25, 1] : 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="no-press p-0.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed"
          >
            <Star className={cn("w-8 h-8 transition-colors", on ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35")} />
          </motion.button>
        );
      })}
    </div>
  );
}
