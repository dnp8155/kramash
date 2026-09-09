import AuthProductPanel from "./AuthProductPanel";

// Shared auth layout. Split-screen on desktop with product panel;
// single-column on mobile. `showProduct={false}` gives a compact centered
// layout for Forgot/Reset pages.
export default function AuthShell({ children, showProduct = true, panel }) {
  if (!showProduct) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left: Auth panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 pt-12 pb-20 lg:px-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
      {/* Right: Product panel */}
      <div className="hidden lg:block lg:w-[48%] xl:w-[46%]">
        {panel || <AuthProductPanel />}
      </div>
    </div>
  );
}