export default function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}