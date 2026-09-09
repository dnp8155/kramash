import { Camera, CalendarDays, Building2, Briefcase } from "lucide-react";

export const LANDING_CATEGORIES = [
  {
    key: "PHOTOGRAPHY",
    label: "Photography",
    icon: Camera,
    labels: {
      work: "Events",
      workSingular: "Event",
      date: "Event Date",
      venue: "Venue",
      team: "Team / Crew",
      activeWork: "Active Events",
    },
    items: [
      { title: "Sharma Wedding", date: "Oct 15", venue: "The Leela Palace", status: "Confirmed" },
      { title: "IIT Bombay Convocation", date: "Oct 22", venue: "IIT Campus", status: "Pending" },
      { title: "Mehta Corporate Shoot", date: "Nov 03", venue: "BKC Studio", status: "Confirmed" },
    ],
  },
  {
    key: "EVENT_MANAGEMENT",
    label: "Event Management",
    icon: CalendarDays,
    labels: {
      work: "Events",
      workSingular: "Event",
      date: "Event Date",
      venue: "Venue",
      team: "Team",
      activeWork: "Active Events",
    },
    items: [
      { title: "Sharma Wedding Gala", date: "Oct 15", venue: "The Leela Palace", status: "Confirmed" },
      { title: "Tech Summit 2026", date: "Oct 22", venue: "Jio World Centre", status: "Pending" },
      { title: "Mehta Sangeet Night", date: "Nov 03", venue: "Taj Lands End", status: "Confirmed" },
    ],
  },
  {
    key: "ARCHITECTURE",
    label: "Architecture",
    icon: Building2,
    labels: {
      work: "Projects",
      workSingular: "Project",
      date: "Start Date",
      venue: "Project Site",
      team: "Project Team",
      activeWork: "Active Projects",
    },
    items: [
      { title: "Sharma Residence", date: "Oct 15", venue: "Bandra West", status: "In Progress" },
      { title: "IIT Bombay Lab", date: "Oct 22", venue: "Powai Campus", status: "Pending" },
      { title: "Mehta Villa Project", date: "Nov 03", venue: "Juhu", status: "Confirmed" },
    ],
  },
  {
    key: "OTHER",
    label: "Other Services",
    icon: Briefcase,
    labels: {
      work: "Projects",
      workSingular: "Project",
      date: "Start Date",
      venue: "Location",
      team: "Team",
      activeWork: "Active Projects",
    },
    items: [
      { title: "Sharma Brand Campaign", date: "Oct 15", venue: "Mumbai Studio", status: "In Progress" },
      { title: "IIT Bombay Consulting", date: "Oct 22", venue: "Powai", status: "Pending" },
      { title: "Mehta Interior Project", date: "Nov 03", venue: "Worli", status: "Confirmed" },
    ],
  },
];

export const STATUS_DOT = {
  Confirmed: "bg-success",
  Pending: "bg-warning",
  "In Progress": "bg-info",
  Cancelled: "bg-destructive",
  Completed: "bg-success",
};