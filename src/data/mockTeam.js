// Temporary sample data — replace with Base44 entity queries in Phase 2.

export const teamMembers = [
  { id: "t1", name: "Krishna", role: "Photographer", bookings: 0, rate: 0, paid: 0, remaining: 0, status: "available", self: true },
  { id: "t2", name: "Amit", role: "Photographer", bookings: 2, rate: 18000, paid: 18000, remaining: 0, status: "available" },
  { id: "t3", name: "Chirag", role: "Drone", bookings: 1, rate: 8000, paid: 8000, remaining: 0, status: "available" },
  { id: "t4", name: "Kiran", role: "Candid Photographer", bookings: 2, rate: 9000, paid: 5000, remaining: 4000, status: "busy" },
  { id: "t5", name: "Jigneshbhai", role: "Photographer", bookings: 0, rate: 0, paid: 0, remaining: 0, status: "inactive" },
  { id: "t6", name: "Parth Kadam", role: "Videographer", bookings: 0, rate: 0, paid: 0, remaining: 0, status: "inactive" },
  { id: "t7", name: "Pintoo", role: "Photographer", bookings: 2, rate: 12000, paid: 12000, remaining: 0, status: "available" },
  { id: "t8", name: "Jeet", role: "Videographer", bookings: 2, rate: 20000, paid: 10000, remaining: 10000, status: "busy" },
  { id: "t9", name: "Ujjawal", role: "Cinematographer", bookings: 2, rate: 22000, paid: 12000, remaining: 10000, status: "busy" },
  { id: "t10", name: "Akshay", role: "Live Telecast", bookings: 1, rate: 1500, paid: 1500, remaining: 0, status: "available" },
  { id: "t11", name: "Sachin", role: "Assistant", bookings: 0, rate: 0, paid: 0, remaining: 0, status: "inactive" }
];

export const teamPlanLimit = { used: 11, limit: 3, proLimit: 50 };