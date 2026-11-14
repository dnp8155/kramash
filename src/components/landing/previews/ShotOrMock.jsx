import React, { useState } from "react";

// Shows a real (anonymised) screenshot of the app from /public/landing. If the image is missing or fails to load,
// the coded mock-up passed as children is shown instead, so a slot is never empty while screenshots are added.
//   width / height — the image's pixel size, so the page reserves its space before it loads (no jump)
//   imgClassName   — replaces the default "fill the width" look (used inside the phone frame)
export default function ShotOrMock({ src, alt = "", width, height, imgClassName, children }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{children}</>;
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      draggable={false}
      data-shot=""
      onError={() => setFailed(true)}
      className={imgClassName || "block w-full h-auto"}
    />
  );
}
