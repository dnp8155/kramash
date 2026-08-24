// Temporary sample data — replace with Base44 entity queries in Phase 2.
// Structure mirrors a future Event entity (workspace-scoped).

export const events = [
  {
    id: "16-2026", name: "Meera & Dev", type: "Reception", date: "26 Aug 2026", status: "upcoming", week: true,
    contract: 32000, received: 12000, paid: 0, left: 20000, profit: 12000,
    team: [{ name: "UNASSIGNED" }, { name: "Jeet", role: "Videographer", date: "26 Aug 2026" }]
  },
  {
    id: "15-2026", name: "Tanvi x Chinmay", type: "Wedding", date: "28 Aug 2026", status: "upcoming", week: true,
    contract: 0, received: 0, paid: 0, left: 0, profit: 0, team: []
  },
  {
    id: "13-2026", name: "Arpan", type: "Pre-Wedding", date: "21 Jun 2026", status: "in-progress", week: false,
    contract: 0, received: 0, paid: 0, left: 0, profit: 0, team: []
  },
  {
    id: "11-2026", name: "Yash & Ruchika", type: "Pre-Wedding", date: "20 Jun 2026", status: "in-progress", week: false,
    contract: 0, received: 0, paid: 0, left: 0, profit: 0, team: []
  },
  {
    id: "9-2026", name: "Tanvi x Chinmay", type: "Wedding", date: "30 Apr 2026", status: "completed", week: false,
    contract: 0, received: 0, paid: 0, left: 0, profit: 0, team: []
  },
  {
    id: "1-2026", name: "Yamini Parikh", type: "Wedding", date: "23, 25 Apr 2026", status: "completed", week: false,
    contract: 0, received: 0, paid: 0, left: 0, profit: 0, team: []
  }
];

export const upcomingEvents = [
  { id: "16-2026", name: "Meera & Dev", date: "26 Aug 2026" },
  { id: "15-2026", name: "Tanvi x Chinmay", date: "28 Aug 2026" }
];

export const planUsage = { used: 6, limit: 5, label: "Free plan" };