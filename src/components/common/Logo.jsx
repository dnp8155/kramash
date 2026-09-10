import { useState } from "react";

export const LOGO_URL =
  "https://media.base44.com/images/public/6a8c4677eeb41482e947f9c6/99658306b_ChatGPTImageAug29202608_10_43PM.png";

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