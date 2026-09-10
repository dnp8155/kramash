// Indian number-to-words converter — shared by backend functions.
// Handles Crore, Lakh, Thousand, Hundred.

function twoDigit(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
}

function threeDigit(n: number): string {
  let str = "";
  if (n >= 100) str += twoDigit(Math.floor(n / 100)) + " Hundred ";
  n %= 100;
  if (n > 0) str += twoDigit(n);
  return str.trim();
}

export function numberToIndianWords(num: number): string {
  if (num === 0) return "Zero";
  let result = "";
  let n = Math.floor(Math.abs(num));
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = n;
  if (crore > 0) result += twoDigit(crore) + " Crore ";
  if (lakh > 0) result += twoDigit(lakh) + " Lakh ";
  if (thousand > 0) result += twoDigit(thousand) + " Thousand ";
  if (hundred > 0) result += threeDigit(hundred);
  return result.trim();
}

export function amountInWords(amount: number, currency = "INR"): string {
  const rupees = Math.floor(Math.abs(amount || 0));
  const paise = Math.round((Math.abs(amount || 0) - rupees) * 100);
  let words = numberToIndianWords(rupees);
  if (paise > 0) words += " and " + numberToIndianWords(paise) + " Paise";
  return `Rupees ${words} Only`;
}