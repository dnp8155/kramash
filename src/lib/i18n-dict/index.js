// Per-area translation dictionaries, merged into the base dictionary in ../i18n.js.
// Each file exports { hi: {...}, gu: {...} } keyed by the exact English string passed to t().
import events from "./events";
import team from "./team";
import billing from "./billing";
import people from "./people";
import shell from "./shell";

const parts = [events, team, billing, people, shell];

export function mergeDicts(base) {
  const out = { hi: { ...base.hi }, gu: { ...base.gu } };
  for (const p of parts) {
    for (const lang of ["hi", "gu"]) Object.assign(out[lang], p[lang] || {});
  }
  return out;
}
