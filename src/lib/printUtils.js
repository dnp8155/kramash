// Print just one element of a page (e.g. the job sheet), not the whole app around it.
//
// Plain "hide the chrome" CSS isn't enough inside the app: the sidebar and header still take up
// space, and the layout is a fixed-height, overflow-hidden shell that cuts the printout to one
// screen. So for the duration of the print we
//   1. hide every sibling along the path from the element up to <body> (sidebar, header, dialogs…),
//   2. turn each ancestor on that path into a plain, unclipped block (see "Print only" in index.css),
//   3. put things back afterwards.

const HIDE = "data-print-hide";
const ANCESTOR = "data-print-ancestor";
const TARGET = "data-print-target";

// Marks the page for printing `el`. Returns a function that undoes everything.
export function preparePrintOnly(el, bodyClass) {
  const touched = [];
  const mark = (node, attr) => { node.setAttribute(attr, ""); touched.push([node, attr]); };

  el.setAttribute(TARGET, "");
  touched.push([el, TARGET]);
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (node !== el) mark(node, ANCESTOR);
    const parent = node.parentElement;
    if (!parent) break;
    for (const sibling of parent.children) {
      if (sibling !== node && !["SCRIPT", "STYLE", "LINK"].includes(sibling.tagName)) mark(sibling, HIDE);
    }
  }
  // Portals (toasts, dialogs) live directly under <body>.
  for (const child of document.body.children) {
    if (!child.hasAttribute(ANCESTOR) && !["SCRIPT", "STYLE", "LINK"].includes(child.tagName) && !child.contains(el)) mark(child, HIDE);
  }
  if (bodyClass) document.body.classList.add(bodyClass);
  document.documentElement.setAttribute("data-printing", "");

  return () => {
    for (const [node, attr] of touched) node.removeAttribute(attr);
    if (bodyClass) document.body.classList.remove(bodyClass);
    document.documentElement.removeAttribute("data-printing");
  };
}

export function printElementOnly(el, bodyClass) {
  if (!el) { window.print(); return; }
  const restore = preparePrintOnly(el, bodyClass);
  let done = false;
  const finish = () => { if (done) return; done = true; window.removeEventListener("afterprint", finish); restore(); };
  window.addEventListener("afterprint", finish);
  // Layout needs a moment to apply before the print dialog captures the page.
  requestAnimationFrame(() => {
    window.print();
    // Some browsers (iOS Safari) never fire afterprint; don't leave the page in print mode.
    setTimeout(finish, 60000);
  });
}
