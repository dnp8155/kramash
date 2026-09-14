import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Shows a back arrow on mobile only (hidden on lg+). Used at the top of
// detail/editor pages so users on phones can navigate back without
// reaching for the browser/OS back gesture.
export default function MobileBackButton({ to, fallback = "/dashboard" }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      onClick={handleBack}
      className="lg:hidden inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
    >
      <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center transition-colors">
        <ArrowLeft className="w-4 h-4" />
      </span>
      Back
    </button>
  );
}