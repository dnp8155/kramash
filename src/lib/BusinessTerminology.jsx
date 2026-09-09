// Centralized business terminology system for Kramashah multi-industry support.
// Maps workspace business_category to UI labels (Event vs Project vs Job, etc.)
// All user-facing "Event" terminology should resolve through this module.

import { createContext, useContext, useMemo } from "react";
import { useWorkspace } from "@/lib/WorkspaceContext";

// ─── Category constants ───
export const BUSINESS_CATEGORIES = {
  PHOTOGRAPHY: "PHOTOGRAPHY",
  EVENT_MANAGEMENT: "EVENT_MANAGEMENT",
  ARCHITECTURE: "ARCHITECTURE",
  OTHER: "OTHER",
};

export const CATEGORY_LABELS = {
  PHOTOGRAPHY: "Photography",
  EVENT_MANAGEMENT: "Event Management",
  ARCHITECTURE: "Architecture",
  OTHER: "Other Service Business",
};

// ─── Terminology presets per category ───
const TERMINOLOGY_PRESETS = {
  PHOTOGRAPHY: {
    workItemSingular: "Event",
    workItemPlural: "Events",
    createWorkItemLabel: "New Event",
    editWorkItemLabel: "Edit Event",
    viewWorkItemLabel: "View Event",
    workItemDetailsLabel: "Event Details",
    locationLabel: "Venue",
    locationAddressLabel: "Venue Address",
    dateLabel: "Event Date",
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    teamLabel: "Team / Crew",
    activeWorkLabel: "Active Events",
    upcomingWorkLabel: "Upcoming Events",
    totalWorkLabel: "Total Events",
    completedWorkLabel: "Completed Events",
    profitabilityLabel: "Event Profitability",
    financialSummaryLabel: "Event Financial Summary",
    searchPlaceholder: "Search events, clients, venues…",
    clientWorkLabel: "Client Events",
    assignedToLabel: "Booked on Event",
    exportFilename: "Events",
    reminderMessage: "Your event starts tomorrow.",
    sidebarSubtitle: "Production Suite",
  },
  EVENT_MANAGEMENT: {
    workItemSingular: "Event",
    workItemPlural: "Events",
    createWorkItemLabel: "New Event",
    editWorkItemLabel: "Edit Event",
    viewWorkItemLabel: "View Event",
    workItemDetailsLabel: "Event Details",
    locationLabel: "Venue",
    locationAddressLabel: "Venue Address",
    dateLabel: "Event Date",
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    teamLabel: "Team",
    activeWorkLabel: "Active Events",
    upcomingWorkLabel: "Upcoming Events",
    totalWorkLabel: "Total Events",
    completedWorkLabel: "Completed Events",
    profitabilityLabel: "Event Profitability",
    financialSummaryLabel: "Event Financial Summary",
    searchPlaceholder: "Search events, clients, venues…",
    clientWorkLabel: "Client Events",
    assignedToLabel: "Booked on Event",
    exportFilename: "Events",
    reminderMessage: "Your event starts tomorrow.",
    sidebarSubtitle: "Event Suite",
  },
  ARCHITECTURE: {
    workItemSingular: "Project",
    workItemPlural: "Projects",
    createWorkItemLabel: "New Project",
    editWorkItemLabel: "Edit Project",
    viewWorkItemLabel: "View Project",
    workItemDetailsLabel: "Project Details",
    locationLabel: "Project Site",
    locationAddressLabel: "Site Address",
    dateLabel: "Start Date",
    startDateLabel: "Start Date",
    endDateLabel: "Expected End Date",
    teamLabel: "Project Team",
    activeWorkLabel: "Active Projects",
    upcomingWorkLabel: "Active Projects",
    totalWorkLabel: "Total Projects",
    completedWorkLabel: "Completed Projects",
    profitabilityLabel: "Project Profitability",
    financialSummaryLabel: "Project Financial Summary",
    searchPlaceholder: "Search projects, clients, sites…",
    clientWorkLabel: "Client Projects",
    assignedToLabel: "Assigned to Project",
    exportFilename: "Projects",
    reminderMessage: "Your project starts tomorrow.",
    sidebarSubtitle: "Project Suite",
  },
  OTHER: {
    workItemSingular: "Project",
    workItemPlural: "Projects",
    createWorkItemLabel: "New Project",
    editWorkItemLabel: "Edit Project",
    viewWorkItemLabel: "View Project",
    workItemDetailsLabel: "Project Details",
    locationLabel: "Location",
    locationAddressLabel: "Location Address",
    dateLabel: "Start Date",
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    teamLabel: "Team",
    activeWorkLabel: "Active Projects",
    upcomingWorkLabel: "Active Projects",
    totalWorkLabel: "Total Projects",
    completedWorkLabel: "Completed Projects",
    profitabilityLabel: "Project Profitability",
    financialSummaryLabel: "Project Financial Summary",
    searchPlaceholder: "Search projects, clients, locations…",
    clientWorkLabel: "Client Projects",
    assignedToLabel: "Assigned to Project",
    exportFilename: "Projects",
    reminderMessage: "Your project starts tomorrow.",
    sidebarSubtitle: "Business Suite",
  },
};

// Default fallback (Photography) used when workspace has no category yet.
const DEFAULT_TERMINOLOGY = TERMINOLOGY_PRESETS.PHOTOGRAPHY;

// ─── Safe category resolution ───
// Maps legacy business_type strings to the new category enum for existing workspaces.
export function inferCategory(workspace) {
  if (!workspace) return BUSINESS_CATEGORIES.PHOTOGRAPHY;
  if (workspace.business_category && Object.values(BUSINESS_CATEGORIES).includes(workspace.business_category)) {
    return workspace.business_category;
  }
  // Try to infer from legacy business_type string
  const bt = (workspace.business_type || "").toLowerCase();
  if (bt.includes("photo") || bt.includes("video") || bt.includes("wedding") || bt.includes("cinema")) {
    return BUSINESS_CATEGORIES.PHOTOGRAPHY;
  }
  if (bt.includes("event")) {
    return BUSINESS_CATEGORIES.EVENT_MANAGEMENT;
  }
  if (bt.includes("architect")) {
    return BUSINESS_CATEGORIES.ARCHITECTURE;
  }
  // Default: treat unknown existing workspaces as Photography (safe default —
  // preserves existing Event terminology they already see).
  return BUSINESS_CATEGORIES.PHOTOGRAPHY;
}

// ─── Core resolver ───
// Returns the full terminology object for a workspace, applying custom overrides.
export function getBusinessTerminology(workspace) {
  const category = inferCategory(workspace);
  const base = TERMINOLOGY_PRESETS[category] || DEFAULT_TERMINOLOGY;

  // Apply custom work label overrides if the workspace has them
  const customSingular = workspace?.custom_work_label_singular?.trim();
  const customPlural = workspace?.custom_work_label_plural?.trim();

  if (customSingular || customPlural) {
    const singular = customSingular || base.workItemSingular;
    const plural = customPlural || base.workItemPlural;
    return {
      ...base,
      workItemSingular: singular,
      workItemPlural: plural,
      createWorkItemLabel: `New ${singular}`,
      editWorkItemLabel: `Edit ${singular}`,
      viewWorkItemLabel: `View ${singular}`,
      workItemDetailsLabel: `${singular} Details`,
      activeWorkLabel: `Active ${plural}`,
      upcomingWorkLabel: `Upcoming ${plural}`,
      totalWorkLabel: `Total ${plural}`,
      completedWorkLabel: `Completed ${plural}`,
      profitabilityLabel: `${singular} Profitability`,
      financialSummaryLabel: `${singular} Financial Summary`,
      searchPlaceholder: `Search ${plural.toLowerCase()}, clients, locations…`,
      clientWorkLabel: `Client ${plural}`,
      assignedToLabel: `Assigned to ${singular}`,
      exportFilename: plural,
      reminderMessage: `Your ${singular.toLowerCase()} starts tomorrow.`,
    };
  }

  return base;
}

// ─── Context ───
const BusinessTerminologyContext = createContext(null);

export const BusinessTerminologyProvider = ({ children }) => {
  const { currentWorkspace } = useWorkspace();
  const terminology = useMemo(
    () => getBusinessTerminology(currentWorkspace),
    [currentWorkspace]
  );
  const category = useMemo(
    () => inferCategory(currentWorkspace),
    [currentWorkspace]
  );

  const value = {
    ...terminology,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    customBusinessType: currentWorkspace?.custom_business_type || "",
    businessType: currentWorkspace?.business_type || "",
  };

  return (
    <BusinessTerminologyContext.Provider value={value}>
      {children}
    </BusinessTerminologyContext.Provider>
  );
};

// Hook: returns the full terminology object for the current workspace.
export const useBusinessTerminology = () => {
  const ctx = useContext(BusinessTerminologyContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider (rare).
    return DEFAULT_TERMINOLOGY;
  }
  return ctx;
};

// Hook: returns just the category + label info.
export const useBusinessCategory = () => {
  const ctx = useContext(BusinessTerminologyContext);
  if (!ctx) {
    return {
      category: BUSINESS_CATEGORIES.PHOTOGRAPHY,
      categoryLabel: CATEGORY_LABELS.PHOTOGRAPHY,
      customBusinessType: "",
    };
  }
  return {
    category: ctx.category,
    categoryLabel: ctx.categoryLabel,
    customBusinessType: ctx.customBusinessType,
  };
};