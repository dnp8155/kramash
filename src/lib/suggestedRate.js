// Suggested agreed rate for a team assignment: a Per Day rate is multiplied by the number of working days,
// anything else is the rate as-is. Rounded to paise so float noise (e.g. 1499.99 × 3) never reaches the field.
export function suggestedRate(rateType, rate, days) {
  if (rate == null || rate === "") return "";
  const base = Number(rate) || 0;
  const total = rateType === "Per Day" ? base * (days || 1) : base;
  return String(Math.round(total * 100) / 100);
}
