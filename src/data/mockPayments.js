// Temporary sample data — replace with Base44 entity queries in Phase 2.

export const paymentSummary = {
  received: 135000,
  paid: 75500,
  profit: 59500,
  online: { received: 135000, paid: 0 },
  cash: { received: 0, paid: 0 }
};

export const payments = [
  { id: "p1", description: "Advance from client", client: "Tanvi x Chinmay", date: "22 Aug 2026", source: "UPI", amount: 20000, type: "received" },
  { id: "p2", description: "Booking advance", client: "Meera & Dev", date: "20 Aug 2026", source: "BANK TRANSFER", amount: 12000, type: "received" },
  { id: "p3", description: "Full payment on the day", client: "Tanvi x Chinmay", date: "30 Apr 2026", source: "UPI", amount: 48000, type: "received" },
  { id: "p4", description: "Advance + Balance from client", client: "Yamini Parikh", date: "20 Apr 2026", source: "BANK TRANSFER", amount: 55000, type: "received" }
];

export const financialYear = "April 2026 - March 2027";