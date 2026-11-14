import { useState } from "react";
import Collapse from "@/components/common/Collapse";

// An open/close block that replaces the browser's <details>/<summary> (which snaps open). Same look, but the content
// slides with the app's CSS height transition. `summary` can be a function that gets `open`, to turn an arrow.
export default function Disclosure({ summary, children, defaultOpen = false, className, summaryClassName }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={summaryClassName}>
        {typeof summary === "function" ? summary(open) : summary}
      </button>
      <Collapse open={open}>{children}</Collapse>
    </div>
  );
}
