// Safe rich text for quotation/invoice terms, payment conditions and similar fields.
//
// These fields hold HTML from the editor (bold, italic, underline, lists, links…) and are
// shown to clients and written into PDFs, so they must never be rendered raw: a script tag
// or an onerror handler in there would run in the client's browser. Everything goes through
// sanitizeRichHtml, which keeps the formatting people expect and removes anything else.
//
// Plain text (the default terms, or text typed without formatting) is turned into
// paragraphs and line breaks, so it no longer collapses into a single block.

import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "hr", "div", "span",
  "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup",
  "ul", "ol", "li",
  "a", "blockquote",
  "h1", "h2", "h3", "h4",
];
const ALLOWED_ATTR = ["href", "target", "rel", "class", "style", "data-list"];

// Inline styles the editor produces (text colour, highlight, alignment). Nothing else.
const SAFE_STYLE = /^(color|background-color|text-align)$/i;
const SAFE_VALUE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+|left|right|center|justify)$/i;

function cleanStyle(style) {
  return String(style || "")
    .split(";")
    .map((decl) => decl.split(":").map((x) => x.trim()))
    .filter(([prop, value]) => prop && value && SAFE_STYLE.test(prop) && SAFE_VALUE.test(value))
    .map(([prop, value]) => `${prop}: ${value}`)
    .join("; ");
}

let hooksInstalled = false;
function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.hasAttribute?.("style")) {
      const cleaned = cleanStyle(node.getAttribute("style"));
      if (cleaned) node.setAttribute("style", cleaned);
      else node.removeAttribute("style");
    }
    // Only the editor's own class names (ql-align-center, ql-indent-1 …).
    if (node.hasAttribute?.("class")) {
      const kept = node.getAttribute("class").split(/\s+/).filter((c) => /^ql-[\w-]+$/.test(c)).join(" ");
      if (kept) node.setAttribute("class", kept);
      else node.removeAttribute("class");
    }
    // Links open in a new tab and can't reach back into the page.
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Blank line = new paragraph, single newline = line break.
function plainTextToHtml(text) {
  return String(text)
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function sanitizeRichHtml(input) {
  if (input === null || input === undefined || input === "") return "";
  const text = String(input);
  if (!/<[a-z][\s\S]*>/i.test(text)) return plainTextToHtml(text);
  installHooks();
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input", "svg", "math"],
  });
}

// Plain-text version (for places that can't show formatting).
export function richHtmlToText(input) {
  const html = sanitizeRichHtml(input);
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html.replace(/<\/(p|li|h[1-4]|blockquote)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  return (div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}
