import { formatMoney } from "@/utils/format";
import { clientSections, parseGroups, packagePrice } from "@/lib/packageStructure";
import { receiptTheme } from "@/components/events/TransactionShareCard";

// Same look as the payment receipt card (TransactionShareCard): fixed 380px, rendered to a PNG by SharePackageDialog.
// `logoSrc` is already a data URL so html2canvas never has to fetch it. Roles show by name only, never a person.
const COLORS = { bg: "#FFFFFF", border: "#E8E5DD", text: "#2D2D2D", muted: "#8A8580", label: "#9B9690", tick: "#2E7D5B", tint: "#F0F5F5" };
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

function Heading({ children }) {
  return <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.label, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: "16px", margin: "14px 0 4px" }}>{children}</div>;
}

export default function PackageShareCard({ pkg, workspace, currency = "INR", showPrices = false, showTotal = true, logoSrc = null, logoInfo = null }) {
  if (!pkg) return null;
  const groups = parseGroups(pkg.structure_json);
  const { sections, includes } = clientSections(groups, { prices: showPrices });
  const total = packagePrice(groups, pkg.total_override);
  const theme = logoSrc ? receiptTheme(logoInfo) : null;
  const bizName = workspace?.name || "Kramasha";
  const tint = theme ? theme.tint : COLORS.tint;

  return (
    <div style={{ width: "380px", background: COLORS.bg, borderRadius: "16px", border: `1px solid ${COLORS.border}`, padding: "22px 22px 18px", fontFamily: FONT, boxSizing: "border-box", color: COLORS.text, WebkitFontSmoothing: "antialiased" }}>
      <div style={theme
        ? { display: "flex", alignItems: "center", gap: "12px", margin: "-22px -22px 0", padding: "18px 22px", background: theme.bg, borderRadius: "15px 15px 0 0" }
        : { display: "flex", alignItems: "center", gap: "12px", paddingBottom: "16px", borderBottom: `1px solid ${COLORS.border}` }}>
        {logoSrc && (
          <img src={logoSrc} alt="" style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "10px", border: `1px solid ${COLORS.border}`, background: "#fff", flexShrink: 0, padding: theme ? "3px" : 0, boxSizing: "border-box" }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: theme ? theme.text : COLORS.text, lineHeight: "20px", wordBreak: "break-word" }}>{bizName}</div>
          <div style={{ fontSize: "11px", color: theme ? theme.sub : COLORS.muted, lineHeight: "16px" }}>Package</div>
        </div>
      </div>

      <div style={{ margin: "16px 0 4px", padding: "16px", borderRadius: "12px", background: tint, textAlign: "center" }}>
        <div style={{ fontSize: "18px", fontWeight: 800, color: COLORS.text, lineHeight: "26px", wordBreak: "break-word" }}>{pkg.name}</div>
        {pkg.description && <div style={{ fontSize: "12px", color: COLORS.muted, lineHeight: "18px", marginTop: "4px", wordBreak: "break-word" }}>{pkg.description}</div>}
        {showTotal && total > 0 && (
          <>
            <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.label, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: "16px", marginTop: "12px" }}>Package price</div>
            <div style={{ fontSize: "30px", fontWeight: 800, color: COLORS.text, lineHeight: "40px" }}>{formatMoney(total, currency)}</div>
          </>
        )}
      </div>

      {sections.length > 0 && <Heading>What's included</Heading>}
      {sections.map((s, i) => (
        <div key={i}>
          {s.title && <div style={{ fontSize: "12px", fontWeight: 700, color: COLORS.text, lineHeight: "18px", marginTop: i === 0 ? "2px" : "10px" }}>{s.title}</div>}
          {s.lines.map((l, j) => (
            <div key={j} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", padding: "8px 0", borderBottom: `1px dashed ${COLORS.border}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text, lineHeight: "18px", wordBreak: "break-word" }}>{l.name}</div>
                {(l.detail || l.note) && <div style={{ fontSize: "11px", color: COLORS.muted, lineHeight: "16px", wordBreak: "break-word" }}>{[l.detail, l.note].filter(Boolean).join(" · ")}</div>}
              </div>
              {l.amount != null && l.amount > 0 && <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.text, lineHeight: "18px", whiteSpace: "nowrap" }}>{formatMoney(l.amount, currency)}</div>}
            </div>
          ))}
        </div>
      ))}

      {includes.length > 0 && (
        <>
          <Heading>Includes</Heading>
          {includes.map((name, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", color: COLORS.text, lineHeight: "20px", wordBreak: "break-word" }}>
              <span style={{ color: COLORS.tick, fontWeight: 700 }}>✓</span><span>{name}</span>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: `1px solid ${COLORS.border}`, textAlign: "center" }}>
        <div style={{ fontSize: "12px", color: COLORS.muted, lineHeight: "17px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{(pkg.footer_message || "").trim() || "Thank you for considering us"}</div>
        <div style={{ marginTop: "4px", fontSize: "9px", color: COLORS.muted, lineHeight: "13px" }}>Made with Kramasha</div>
      </div>
    </div>
  );
}
