export const mockQuotations = [
  {
    id: "q-2026-001",
    client: "Rahul Sharma",
    event: "Sharma Wedding",
    date: "2026-09-22",
    amount: 285000,
    status: "Sent",
    agreementSigned: true,
  },
  {
    id: "q-2026-002",
    client: "Mehta Enterprises",
    event: "Mehta Corporate Gala",
    date: "2026-09-28",
    amount: 180000,
    status: "Accepted",
    agreementSigned: true,
  },
  {
    id: "q-2026-003",
    client: "Suresh Iyer",
    event: "Ananya Birthday Bash",
    date: "2026-10-05",
    amount: 65000,
    status: "Draft",
    agreementSigned: false,
  },
  {
    id: "q-2026-004",
    client: "Karan Desai",
    event: "Desai Pre-Wedding Shoot",
    date: "2026-10-12",
    amount: 48000,
    status: "Accepted",
    agreementSigned: true,
  },
  {
    id: "q-2026-005",
    client: "IIT Bombay",
    event: "TechFest 2026 Aftermovie",
    date: "2026-10-20",
    amount: 120000,
    status: "Sent",
    agreementSigned: false,
  },
];

export const quotationStatuses = ["Draft", "Sent", "Accepted", "Rejected", "Expired"];

export const mockServiceCatalog = [
  { id: "svc-1", name: "Wedding Photography (Full Day)", category: "Photography", basePrice: 75000, unit: "per day" },
  { id: "svc-2", name: "Cinematic Wedding Film", category: "Videography", basePrice: 95000, unit: "per event" },
  { id: "svc-3", name: "Pre-Wedding Shoot", category: "Photography", basePrice: 35000, unit: "per session" },
  { id: "svc-4", name: "Drone Coverage", category: "Aerial", basePrice: 18000, unit: "per day" },
  { id: "svc-5", name: "Event Highlights Reel", category: "Videography", basePrice: 25000, unit: "per event" },
  { id: "svc-6", name: "Corporate Event Coverage", category: "Photography", basePrice: 60000, unit: "per day" },
  { id: "svc-7", name: "Photo Album (Premium)", category: "Deliverables", basePrice: 12000, unit: "per album" },
  { id: "svc-8", name: "Same-Day Edit Teaser", category: "Videography", basePrice: 15000, unit: "per event" },
];