// Number-to-words for Indian currency (INR).
export function numberToWordsIndian(num) {
  num = Math.floor(Math.abs(Number(num) || 0));
  if (num === 0) return "Zero";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }

  function threeDigits(n) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let str = "";
    if (h) str += ones[h] + " Hundred";
    if (r) str += (h ? " " : "") + twoDigits(r);
    return str;
  }

  const units = [
    { val: 10000000, name: "Crore" },
    { val: 100000, name: "Lakh" },
    { val: 1000, name: "Thousand" },
    { val: 100, name: "Hundred" }
  ];

  let result = "";
  let remaining = num;
  let lastChunk = remaining % 100;

  for (const u of units) {
    if (remaining >= u.val) {
      const count = Math.floor(remaining / u.val);
      if (u.name === "Hundred" && count >= 10) continue;
      result += (result ? " " : "") + twoDigits(count) + " " + u.name;
      remaining = remaining % u.val;
    }
  }

  if (remaining > 0) {
    result += (result ? " " : "") + twoDigits(remaining);
  } else if (!result && lastChunk > 0) {
    result = twoDigits(lastChunk);
  }

  return result.trim() + " Only";
}

export function amountInWords(amount, currency = "INR") {
  const value = Number(amount) || 0;
  const words = numberToWordsIndian(Math.floor(value));
  const prefix = currency === "INR" ? "Rupees " : "";
  return prefix + words;
}