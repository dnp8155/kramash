import { Link } from "react-router-dom";

export default function AuthLogo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2" aria-label="Kramashah home">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        K
      </div>
      <span className="text-lg font-bold tracking-tight text-foreground">Kramashah</span>
    </Link>
  );
}