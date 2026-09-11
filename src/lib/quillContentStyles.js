// Shared CSS for rendering Quill rich-text HTML inside PDF templates.
// Covers alignment, size, links, and list/paragraph spacing across all
// container class names used by the quotation/invoice templates.
export const quillContentCss = `
    .ql-align-center { text-align: center; }
    .ql-align-right { text-align: right; }
    .ql-align-justify { text-align: justify; }
    .ql-size-small { font-size: 0.75em; }
    .ql-size-large { font-size: 1.5em; }
    .ql-size-huge { font-size: 2.5em; }
    .bullet-line ul, .bullet-line ol,
    .editable-list ul, .editable-list ol,
    .payment-text ul, .payment-text ol,
    .terms-block ul, .terms-block ol,
    .terms-content ul, .terms-content ol,
    .notes-block ul, .notes-block ol {
      padding-left: 20px; margin: 4px 0;
    }
    .bullet-line li, .editable-list li, .payment-text li,
    .terms-block li, .terms-content li, .notes-block li {
      margin: 2px 0;
    }
    .bullet-line p, .editable-list p, .payment-text p,
    .terms-block p, .terms-content p, .notes-block p {
      margin: 4px 0;
    }
    .bullet-line a, .editable-list a, .payment-text a,
    .terms-block a, .terms-content a, .notes-block a {
      color: #0066CC; text-decoration: underline;
    }
    .bullet-line strong, .editable-list strong, .payment-text strong,
    .terms-block strong, .terms-content strong, .notes-block strong { font-weight: 700; }
    .bullet-line em, .editable-list em, .payment-text em,
    .terms-block em, .terms-content em, .notes-block em { font-style: italic; }
    .bullet-line u, .editable-list u, .payment-text u,
    .terms-block u, .terms-content u, .notes-block u { text-decoration: underline; }
`;