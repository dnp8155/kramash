import { useState } from "react";

export const LOGO_URL =
  "https://media.base44.com/images/public/6aa198140e2903037c880386/a30538e70_c64751af-b785-4550-9bf7-8fa28ceec0e0.png";

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