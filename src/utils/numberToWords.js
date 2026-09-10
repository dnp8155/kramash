// Indian number-to-words converter for invoice amounts.
// Handles Crore, Lakh, Thousand, Hundred.

function twoDigit(n) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
}

function threeDigit(n) {
  let str = "";
  if (n >= 100) str += twoDigit(Math.floor(n / 100)) + " Hundred ";
  n %= 100;
  if (n > 0) str += twoDigit(n);
  return str.trim();
}

export function numberToIndianWords(num) {
  if (num === 0) return "Zero";
  let result = "";
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = num;
  if (crore > 0) result += twoDigit(crore) + " Crore ";
  if (lakh > 0) result += twoDigit(lakh) + " Lakh ";
  if (thousand > 0) result += twoDigit(thousand) + " Thousand ";
  if (hundred > 0) result += threeDigit(hundred);
  return result.trim();
}

export function amountInWords(amount, currency = "INR") {
  const rupees = Math.floor(Math.abs(amount || 0));
  const paise = Math.round((Math.abs(amount || 0) - rupees) * 100);
  let words = numberToIndianWords(rupees);
  if (paise > 0) words += " and " + numberToIndianWords(paise) + " Paise";
  return `Rupees ${words} Only`;
}