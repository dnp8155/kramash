export const LOGO_URL =
  "https://media.base44.com/images/public/6a8c4677eeb41482e947f9c6/99658306b_ChatGPTImageAug29202608_10_43PM.png";

export default function Logo({ size = 36, className = "" }) {
  return (
    <img
      src={LOGO_URL}
      alt="Kramashah"
      style={{ width: size, height: size }}
      className={`rounded-lg object-cover shrink-0 ${className}`}
    />
  );
}