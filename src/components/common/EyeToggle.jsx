import React from "react";
import { Eye, EyeOff } from "lucide-react";

// Password show/hide icon: the open eye and the eye-with-dash fade into each other with a tiny
// scale + blur, so the change reads as one icon morphing instead of two icons swapping.
export default function EyeToggle({ shown, className = "w-4 h-4" }) {
  const layer = "absolute inset-0 w-full h-full transition-all duration-200 ease-out motion-reduce:transition-none";
  return (
    <span className={`relative inline-block ${className}`} aria-hidden="true">
      <Eye className={`${layer} ${shown ? "opacity-0 scale-75 blur-[1px]" : "opacity-100 scale-100 blur-0"}`} />
      <EyeOff className={`${layer} ${shown ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-75 blur-[1px]"}`} />
    </span>
  );
}
