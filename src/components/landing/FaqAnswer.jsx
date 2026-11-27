import { Link } from "react-router-dom";

// Renders an FAQ answer, turning [label](target) into links:
//   #slug  → another question (opens it here via onJump when it's on this page, else /faq#slug)
//   /path  → a page in the app or site
export default function FaqAnswer({ text, knownSlugs, onJump, linkClassName }) {
  const parts = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const [, label, target] = m;
    if (target.startsWith("#")) {
      const slug = target.slice(1);
      parts.push(knownSlugs?.has(slug) && onJump ? (
        <button key={m.index} type="button" onClick={() => onJump(slug)} className={linkClassName}>{label}</button>
      ) : (
        <Link key={m.index} to={`/faq#${slug}`} className={linkClassName}>{label}</Link>
      ));
    } else {
      parts.push(<Link key={m.index} to={target} className={linkClassName}>{label}</Link>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
