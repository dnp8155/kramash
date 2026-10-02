import { useState } from "react";

export const LOGO_URL = "/kramasha_logo_512x512.png";

export default function Logo({ size = 36, className = "" }) {
  const [imgSrc, setImgSrc] = useState(LOGO_URL);

  return (
    <div
      style={{ width: size, height: size }}
      className={`shrink-0 flex items-center justify-center overflow-hidden rounded-lg ${className}`}
    >
      <img
        src={imgSrc}
        alt="Kramasha"
        className="w-full h-full object-contain"
        draggable={false}
        onError={() => {
          if (imgSrc !== "/icon.svg") {
            setImgSrc("/icon.svg");
          }
        }}
      />
    </div>
  );
}