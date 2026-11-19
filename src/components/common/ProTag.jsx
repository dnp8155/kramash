// The small blue PRO tag shown next to Pro options and in upgrade messages.
export default function ProTag({ children = "Pro", className = "" }) {
  return (
    <span className={`inline-block align-middle text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded ${className}`}>
      {children}
    </span>
  );
}
