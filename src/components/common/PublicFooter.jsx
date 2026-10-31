import { ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// One footer for every page a business shares with outsiders (public profile, client / team portals,
// quotation, invoice, event tracking, job sheet).
//  - `secure="client portal"` adds the shield line "Secure client portal powered by Kramasha", with the
//    business copyright "© 2026 - Business Name" under it.
//  - `note` is a shield line with its own wording (the job sheet's "No financial information"); the
//    copyright line then carries "powered by Kramasha".
//  - With neither (the public profile) it is two lines: "© 2026 - Business Name", then a sparkles icon
//    with "Powered by Kramasha".
export default function PublicFooter({ name, secure, note, className }) {
  const year = new Date().getFullYear();
  const brand = <a href="/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline">Kramasha</a>;
  const shield = (children) => (
    <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
  return (
    <footer className={cn("text-center pt-4 pb-8 space-y-1.5", className)}>
      {secure && shield(<>Secure {secure} powered by {brand}</>)}
      {note && shield(note)}
      {secure ? (
        name && <p className="text-xs text-muted-foreground">© {year} - {name}</p>
      ) : (
        <>
          {name && <p className="text-xs text-muted-foreground">© {year} - {name}</p>}
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Powered by {brand}</span>
          </p>
        </>
      )}
    </footer>
  );
}
