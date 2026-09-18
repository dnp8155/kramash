import { useState } from "react";

export const LOGO_URL =
  "https://media.base44.com/images/public/6aa198140e2903037c880386/929610b3d_generated_image.png";

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