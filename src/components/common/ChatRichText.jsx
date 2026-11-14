import { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { parseChatBlocks, parseInline, splitItem, findEntityLink, findPageLink } from "@/lib/chatText";
import { useT } from "@/hooks/useT";

// A small round button with just an arrow (neutral colour, like the rest of the reply) that lands on that page.
// The words are the tooltip and the screen-reader label.
function OpenLink({ link, onOpen }) {
  const t = useT();
  if (!link) return null;
  const label = t(link.label);
  return (
    <button type="button" onClick={() => onOpen?.(link.to)} aria-label={label} title={label}
      className="no-press ml-2 inline-flex h-5 w-5 items-center justify-center align-middle rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

// "Ravi Patel – ₹5,000": the name reads as the label, the amount stands out.
// One list item: the title, then the details (date, place, day plan) as small muted lines underneath.
function Item({ text, link, onOpen }) {
  const { title, details } = splitItem(text);
  if (!details.length) return <><Inline text={text} /><OpenLink link={link} onOpen={onOpen} /></>;
  return (
    <>
      <span className="font-medium text-foreground">{title}</span><OpenLink link={link} onOpen={onOpen} />
      {details.map((d, i) => <span key={i} className="block text-[13px] text-muted-foreground"><Inline text={d} /></span>)}
    </>
  );
}

function Inline({ text }) {
  const dash = text.match(/^(.{1,60}?)\s[–—]\s(.+₹.*)$/);
  if (dash) {
    return (
      <>
        <span className="font-medium text-foreground">{dash[1]}</span>
        <span className="text-muted-foreground"> – </span>
        {parseInline(dash[2]).map((p, i) => p.t === "amount"
          ? <span key={i} className="font-semibold text-foreground tabular-nums">{p.v}</span>
          : <span key={i}>{p.v}</span>)}
      </>
    );
  }
  return parseInline(text).map((p, i) => p.t === "amount"
    ? <span key={i} className="font-semibold text-foreground tabular-nums">{p.v}</span>
    : <span key={i}>{p.v}</span>);
}

// The assistant's reply as rich text: small headings, real bullet and numbered lists, highlighted amounts, and
// breathing room between groups. Looks the same as the rest of the app instead of a block of plain text.
export default function ChatRichText({ text, linkIndex, onOpen, hint, onHasLinks }) {
  const blocks = parseChatBlocks(text);
  // One link per record and per page in a reply, so it never turns into a wall of "Open" links.
  const used = new Set();
  const linkFor = (line) => {
    const hit = findEntityLink(line, linkIndex) || findPageLink(line);
    if (!hit || used.has(hit.to)) return null;
    used.add(hit.to);
    return hit;
  };
  const body = (
    <>
      {blocks.map((b, i) => {
        if (b.type === "heading") return <div key={i} className="text-[13px] font-semibold text-foreground pt-0.5">{b.text}</div>;
        if (b.type === "kv") return (
          <dl key={i} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-[13px]">
            {b.items.map((it, j) => (
              <div key={j} className="contents">
                <dt className="text-muted-foreground">{it.label}</dt>
                <dd className="min-w-0 font-medium text-foreground"><Inline text={it.value} /><OpenLink link={linkFor(it.value)} onOpen={onOpen} /></dd>
              </div>
            ))}
          </dl>
        );
        if (b.type === "ul") return (
          <ul key={i} className="space-y-1.5">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/45" />
                <span className="min-w-0"><Item text={it} link={linkFor(it)} onOpen={onOpen} /></span>
              </li>
            ))}
          </ul>
        );
        if (b.type === "ol") return (
          <ol key={i} className="space-y-1.5">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[0.15em] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-semibold text-foreground/80">{j + 1}</span>
                <span className="min-w-0"><Item text={it} link={linkFor(it)} onOpen={onOpen} /></span>
              </li>
            ))}
          </ol>
        );
        return <p key={i}><Inline text={b.text} /><OpenLink link={linkFor(b.text)} onOpen={onOpen} /></p>;
      })}
    </>
  );
  const hasLinks = used.size > 0;
  useEffect(() => { if (hasLinks) onHasLinks?.(); }, [hasLinks]);
  return (
    <div className="space-y-2.5 break-words leading-relaxed">
      {body}
      {hint && hasLinks && (
        // Shown once, the first time someone sees these buttons, so the little arrow is not a mystery.
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-background"><ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" /></span>
          {hint}
        </p>
      )}
    </div>
  );
}
