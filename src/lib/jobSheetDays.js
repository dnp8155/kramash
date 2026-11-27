// A job sheet opened for one team member (?for=<id>) shows that member's days first. The server returns the dates
// they're named on (viewer.dates); with none (not on any day, or no ?for) every day shows and there is no toggle.
export function jobSheetDays(itinerary, viewerDates, showAll) {
  const all = Array.isArray(itinerary) ? itinerary : [];
  const mine = new Set(Array.isArray(viewerDates) ? viewerDates : []);
  // Only worth a line when it hides something: on every day (or none) → all days, no line.
  const mineCount = all.filter((d) => mine.has(d.date)).length;
  const hasMine = mineCount > 0 && mineCount < all.length;
  const days = hasMine && !showAll ? all.filter((d) => mine.has(d.date)) : all;
  return { days, hasMine, mineCount: hasMine ? mineCount : 0, total: all.length };
}
