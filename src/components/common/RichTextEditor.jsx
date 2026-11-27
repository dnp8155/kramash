import { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useT } from "@/hooks/useT";

// `collapsible`: a long text (e.g. Terms & Conditions) stays `collapsedHeight` px tall with a fade and a
// Show more / Show less button, so one long box does not push the whole page down. It opens by itself when you
// click in to edit, and the button only appears when the text is actually taller than that.
export default function RichTextEditor({ value, onChange, placeholder = "", minHeight = 100, readOnly = false, collapsible = false, collapsedHeight = 200 }) {
  const t = useT();
  const wrapRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [tall, setTall] = useState(false);

  const modules = useMemo(
    () => readOnly ? { toolbar: false } : {
      toolbar: [
        ["bold", "italic", "underline"],
        [{ list: "bullet" }, { list: "ordered" }],
        [{ align: "" }, { align: "center" }, { align: "right" }],
        [{ size: ["small", false, "large", "huge"] }],
        ["link"],
        ["clean"],
      ],
    },
    [readOnly]
  );

  // Is the text taller than the collapsed height? Checked when the text changes, and again whenever the box gets
  // a new size. That second part matters: an editor inside a closed section is hidden (0px tall) when the page
  // loads, so it can only be measured once the section is opened (and again if the window is resized).
  useEffect(() => {
    if (!collapsible) return undefined;
    const wrap = wrapRef.current;
    const measure = () => {
      const ed = wrap?.querySelector(".ql-editor");
      if (ed && ed.clientHeight > 0) setTall(ed.scrollHeight > collapsedHeight + 8);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && wrap) ro.observe(wrap);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); window.removeEventListener("resize", measure); };
  }, [value, collapsible, collapsedHeight, expanded]);

  const collapsed = collapsible && tall && !expanded;

  return (
    <div>
      <div
        ref={wrapRef}
        className={collapsed ? "rich-text-editor-wrapper rte-collapsed" : "rich-text-editor-wrapper"}
        style={{ minHeight, "--rte-collapsed": `${collapsedHeight}px` }}
        onFocusCapture={() => { if (collapsible && !readOnly) setExpanded(true); }}
      >
        <ReactQuill
          theme="snow"
          value={value || ""}
          // Quill rewrites loaded text into its own HTML on mount (e.g. "text" -> "<p>text</p>") and reports
          // it as a change. Only pass on real typing, or a page opened and left would look "edited".
          onChange={(content, _delta, source) => { if (source === "user") onChange?.(content); }}
          modules={modules}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      </div>
      {collapsible && tall && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs font-medium text-primary hover:underline">
          {expanded ? t("Show less") : t("Show more")}
        </button>
      )}
    </div>
  );
}
