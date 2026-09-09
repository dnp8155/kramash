import { Link } from "react-router-dom";

// Displays a transaction submit error. When the error is Financial-Year-related
// (no FY for the date, or FY is closed), shows a direct link to the Financial
// page where the user can create or reopen the applicable Financial Year.
export default function TransactionError({ message }) {
  if (!message) return null;
  const isFYError =
    message.includes("Financial Year") || message.includes("financial year");
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
      <p>{message}</p>
      {isFYError && (
        <Link
          to="/financial"
          className="mt-1.5 inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline"
        >
          Go to Financial Year settings →
        </Link>
      )}
    </div>
  );
}