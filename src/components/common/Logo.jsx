export const LOGO_URL =
  "https://media.base44.com/images/public/6a8c4677eeb41482e947f9c6/99658306b_ChatGPTImageAug29202608_10_43PM.png";

export default function Logo({ size = 36, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`shrink-0 flex items-center justify-center ${className}`}
    >
      <img
        src={LOGO_URL}
        alt="KRAMAS"
        className="max-w-full max-h-full object-contain"
        draggable={false}
      />
    </div>
  );
}