import { Heart } from "lucide-react";

// The "Made with ♥ in …" heart: beats twice, with a soft ripple ring spreading out from it.
export default function BeatingHeart() {
  return (
    <span className="heart-ripple relative inline-flex items-center justify-center">
      <Heart className="heart-beat relative w-3.5 h-3.5 fill-destructive text-destructive" aria-label="love" />
    </span>
  );
}
