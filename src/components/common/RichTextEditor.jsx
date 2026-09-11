import { useMemo } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

export default function RichTextEditor({ value, onChange, placeholder = "", minHeight = 100, readOnly = false }) {
  const modules = useMemo(
    () => readOnly ? { toolbar: false } : {
      toolbar: [
        ["bold", "italic", "underline"],
        [{ list: "bullet" }, { list: "ordered" }],
        ["clean"],
      ],
    },
    [readOnly]
  );

  return (
    <div className="rich-text-editor-wrapper" style={{ minHeight }}>
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}