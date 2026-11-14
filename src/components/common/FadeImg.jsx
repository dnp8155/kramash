import { useState, useRef, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";

// An <img> that fades in once it has loaded instead of popping in. An image that is already in the browser's
// cache is shown straight away (no fade, no flash). If it fails to load it is shown as the browser would, so the
// caller's own onError fallback still works.
export default function FadeImg({ className, onLoad, onError, src, ...props }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    setLoaded(!!(el && el.complete && el.naturalWidth > 0));
  }, [src]);

  return (
    <img
      ref={ref}
      src={src}
      className={cn(className, "transition-opacity duration-300 ease-out", loaded ? "opacity-100" : "opacity-0")}
      onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
      onError={(e) => { setLoaded(true); onError?.(e); }}
      {...props}
    />
  );
}
