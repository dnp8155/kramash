// A date input laid invisibly over our own styled box only opens its calendar when the tap lands on the browser's
// tiny built-in calendar icon on desktop (Windows Chrome / Edge), so a click elsewhere on it seems to do nothing.
// Asking the input to open its picker on click makes the whole box work; phones already do this on tap.
export function openDatePicker(e) {
  const input = e.currentTarget;
  try { if (typeof input.showPicker === "function") input.showPicker(); } catch { /* picker already open or not allowed */ }
}
