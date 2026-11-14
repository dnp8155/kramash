import Logo from "@/components/common/Logo";

// Full-screen "this link / page isn't available" state for the public pages (profile, portal, quotation, invoice,
// job sheet, tracking). Shows the Kramasha logo above the message, in the same layout as the loading splash, so a
// dead link still feels like part of the app. `children` holds an optional action, e.g. a "Back to Sign In" button.
export default function UnavailableScreen({ title, message, children }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6 text-center">
      <Logo size={72} className="rounded-2xl" />
      <div className="mt-4 font-heading text-xl font-bold tracking-tight text-foreground">Kramasha</div>
      <h1 className="mt-6 text-lg font-semibold text-foreground">{title}</h1>
      {message && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{message}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
