// One line of a status card: icon tile, label, and the status on the right (App Lock, Install App…).
export default function StatusRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-8 h-8 rounded-[10px] bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
        <Icon className="w-4 h-4" />
      </span>
      <span className="text-sm text-foreground flex-1 min-w-0">{label}</span>
      <span className="text-xs font-medium flex items-center gap-1 shrink-0 text-right">{children}</span>
    </div>
  );
}
