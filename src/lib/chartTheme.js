// The dashboard's chart look, shared so every chart in the app (dashboard, admin) is drawn the same way.
export const CHART_PRIMARY = "hsl(var(--primary-strong, var(--primary)))";
export const CHART_DESTRUCTIVE = "hsl(var(--destructive))";
export const CHART_SUCCESS = "hsl(var(--success))";

export const CHART_MARGIN = { top: 8, right: 12, left: 0, bottom: 0 };
export const CHART_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
export const CHART_GRID = { strokeDasharray: "3 3", stroke: "hsl(var(--border))", vertical: false };
export const CHART_Y_AXIS_WIDTH = 44;

export const CHART_TOOLTIP = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    fontSize: "12px",
    color: "hsl(var(--popover-foreground))",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))", fontWeight: 600 },
};

// Line/area weight and point markers.
export const CHART_LINE = { strokeWidth: 2.5, activeDot: { r: 5 } };
export const chartDot = (color) => ({ r: 3, fill: color, strokeWidth: 0 });
