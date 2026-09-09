export const mockPayments = [
  {
    id: "pay-5001",
    event: "Sharma Wedding",
    client: "Rahul Sharma",
    amount: 142500,
    date: "2026-09-01",
    method: "UPI",
    status: "Received",
  },
  {
    id: "pay-5002",
    event: "Mehta Corporate Gala",
    client: "Mehta Enterprises",
    amount: 90000,
    date: "2026-09-03",
    method: "Bank Transfer",
    status: "Received",
  },
  {
    id: "pay-5003",
    event: "TechFest 2026 Aftermovie",
    client: "IIT Bombay",
    amount: 60000,
    date: "2026-09-06",
    method: "Cheque",
    status: "Pending",
  },
  {
    id: "pay-5004",
    event: "Desai Pre-Wedding Shoot",
    client: "Karan Desai",
    amount: 48000,
    date: "2026-08-28",
    method: "UPI",
    status: "Received",
  },
  {
    id: "pay-5005",
    event: "Ananya Birthday Bash",
    client: "Suresh Iyer",
    amount: 32500,
    date: "2026-09-10",
    method: "Card",
    status: "Overdue",
  },
  {
    id: "pay-5006",
    event: "Reddy Sangeet Night",
    client: "Lakshmi Reddy",
    amount: 95000,
    date: "2026-08-15",
    method: "Bank Transfer",
    status: "Cancelled",
  },
];

export const paymentStatuses = ["Received", "Pending", "Overdue", "Cancelled"];
export const paymentMethods = ["UPI", "Bank Transfer", "Card", "Cheque", "Cash"];