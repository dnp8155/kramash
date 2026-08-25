// Phase 10 — Central multi-industry terminology system.
// Single source of truth for all category-aware labels. All UI components
// consume this via getBusinessTerminology(workspace) or useBusinessTerminology().
// The underlying Event entity is retained (compatibility layer / Option B);
// only user-facing terminology is resolved here.

export const BUSINESS_CATEGORIES = {
  PHOTOGRAPHY: "PHOTOGRAPHY",
  EVENT_MANAGEMENT: "EVENT_MANAGEMENT",
  ARCHITECTURE: "ARCHITECTURE",
  OTHER: "OTHER"
};

export const BUSINESS_CATEGORY_OPTIONS = [
  {
    value: "PHOTOGRAPHY",
    label: "Photography",
    description: "Weddings, shoots, pre-wedding & studio work"
  },
  {
    value: "EVENT_MANAGEMENT",
    label: "Event Management",
    description: "Weddings, corporate & social events coordination"
  },
  {
    value: "ARCHITECTURE",
    label: "Architecture",
    description: "Projects, site visits & design assignments"
  },
  {
    value: "OTHER",
    label: "Other Service Business",
    description: "Interior, consulting, agency, contracting & more"
  }
];

export function categoryLabel(value) {
  const o = BUSINESS_CATEGORY_OPTIONS.find((x) => x.value === value);
  return o ? o.label : value || "Other";
}

// Internal Event status values -> display labels per category.
const STATUS_LABELS = {
  PHOTOGRAPHY: { upcoming: "Upcoming", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
  EVENT_MANAGEMENT: { upcoming: "Upcoming", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
  ARCHITECTURE: { upcoming: "Planned", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
  OTHER: { upcoming: "Planned", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" }
};

const TERMINOLOGY = {
  PHOTOGRAPHY: {
    workItemSingular: "Event",
    workItemPlural: "Events",
    createWorkItemLabel: "Create Event",
    editWorkItemLabel: "Edit Event",
    viewWorkItemLabel: "View Event",
    addWorkItemLabel: "Add Event",
    workItemDetailsLabel: "Event Details",
    workItemTitleLabel: "Event Title",
    workItemTypeLabel: "Event Type",
    locationLabel: "Venue",
    locationAddressLabel: "Venue Address",
    dateLabel: "Event Date",
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    teamLabel: "Team / Crew",
    activeWorkLabel: "Upcoming Events",
    totalWorkLabel: "Total Events",
    completedWorkLabel: "Completed Events",
    profitabilityLabel: "Event Profitability",
    financialSummaryLabel: "Event Financial Summary",
    searchPlaceholder: "Search events, clients, venue",
    clientWorkLabel: "Client Events",
    bookedLabel: "Booked on Event",
    exportPrefix: "Events",
    quotationSectionLabel: "EVENT",
    emptyTitle: "No events yet",
    emptyDescription: "Create your first event to get started.",
    reminderTomorrowLabel: "Event tomorrow",
    reminderComingLabel: "Event coming up",
    reminderMessage: (title, date, venue) => `"${title}" is scheduled for ${date}${venue ? ` at ${venue}` : ""}.`
  },
  EVENT_MANAGEMENT: {
    workItemSingular: "Event",
    workItemPlural: "Events",
    createWorkItemLabel: "Create Event",
    editWorkItemLabel: "Edit Event",
    viewWorkItemLabel: "View Event",
    addWorkItemLabel: "Add Event",
    workItemDetailsLabel: "Event Details",
    workItemTitleLabel: "Event Title",
    workItemTypeLabel: "Event Type",
    locationLabel: "Venue",
    locationAddressLabel: "Venue Address",
    dateLabel: "Event Date",
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    teamLabel: "Team",
    activeWorkLabel: "Upcoming Events",
    totalWorkLabel: "Total Events",
    completedWorkLabel: "Completed Events",
    profitabilityLabel: "Event Profitability",
    financialSummaryLabel: "Event Financial Summary",
    searchPlaceholder: "Search events, clients, venue",
    clientWorkLabel: "Client Events",
    bookedLabel: "Booked on Event",
    exportPrefix: "Events",
    quotationSectionLabel: "EVENT",
    emptyTitle: "No events yet",
    emptyDescription: "Create your first event to get started.",
    reminderTomorrowLabel: "Event tomorrow",
    reminderComingLabel: "Event coming up",
    reminderMessage: (title, date, venue) => `"${title}" is scheduled for ${date}${venue ? ` at ${venue}` : ""}.`
  },
  ARCHITECTURE: {
    workItemSingular: "Project",
    workItemPlural: "Projects",
    createWorkItemLabel: "Create Project",
    editWorkItemLabel: "Edit Project",
    viewWorkItemLabel: "View Project",
    addWorkItemLabel: "Add Project",
    workItemDetailsLabel: "Project Details",
    workItemTitleLabel: "Project Title",
    workItemTypeLabel: "Project Type",
    locationLabel: "Project Site",
    locationAddressLabel: "Site Address",
    dateLabel: "Start Date",
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    teamLabel: "Project Team",
    activeWorkLabel: "Active Projects",
    totalWorkLabel: "Total Projects",
    completedWorkLabel: "Completed Projects",
    profitabilityLabel: "Project Profitability",
    financialSummaryLabel: "Project Financial Summary",
    searchPlaceholder: "Search projects, clients, site",
    clientWorkLabel: "Client Projects",
    bookedLabel: "Assigned to Project",
    exportPrefix: "Projects",
    quotationSectionLabel: "PROJECT",
    emptyTitle: "No projects yet",
    emptyDescription: "Create your first project to get started.",
    reminderTomorrowLabel: "Project starts tomorrow",
    reminderComingLabel: "Project coming up",
    reminderMessage: (title, date, venue) => `"${title}" starts on ${date}${venue ? ` at ${venue}` : ""}.`
  },
  OTHER: {
    workItemSingular: "Project",
    workItemPlural: "Projects",
    createWorkItemLabel: "Create Project",
    editWorkItemLabel: "Edit Project",
    viewWorkItemLabel: "View Project",
    addWorkItemLabel: "Add Project",
    workItemDetailsLabel: "Project Details",
    workItemTitleLabel: "Project Title",
    workItemTypeLabel: "Project Type",
    locationLabel: "Location",
    locationAddressLabel: "Location Address",
    dateLabel: "Start Date",
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    teamLabel: "Team",
    activeWorkLabel: "Active Projects",
    totalWorkLabel: "Total Projects",
    completedWorkLabel: "Completed Projects",
    profitabilityLabel: "Project Profitability",
    financialSummaryLabel: "Project Financial Summary",
    searchPlaceholder: "Search projects, clients, location",
    clientWorkLabel: "Client Projects",
    bookedLabel: "Assigned to Project",
    exportPrefix: "Projects",
    quotationSectionLabel: "PROJECT",
    emptyTitle: "No projects yet",
    emptyDescription: "Create your first project to get started.",
    reminderTomorrowLabel: "Project starts tomorrow",
    reminderComingLabel: "Project coming up",
    reminderMessage: (title, date, venue) => `"${title}" starts on ${date}${venue ? ` at ${venue}` : ""}.`
  }
};

// Infer a business category from a legacy free-text business_type string.
// Used to safely default existing workspaces that predate business_category.
export function inferCategoryFromType(businessType) {
  if (!businessType) return BUSINESS_CATEGORIES.OTHER;
  const t = String(businessType).toLowerCase();
  if (t.includes("photo")) return BUSINESS_CATEGORIES.PHOTOGRAPHY;
  if (t.includes("event")) return BUSINESS_CATEGORIES.EVENT_MANAGEMENT;
  if (t.includes("architect")) return BUSINESS_CATEGORIES.ARCHITECTURE;
  return BUSINESS_CATEGORIES.OTHER;
}

// Resolve the effective business category for a workspace (with safe default).
export function resolveBusinessCategory(workspace) {
  if (workspace?.business_category) return workspace.business_category;
  return inferCategoryFromType(workspace?.business_type);
}

// Central terminology resolver. Returns a flat object of labels for the
// workspace's business category, applying any custom work-label override.
export function getBusinessTerminology(workspace) {
  const category = resolveBusinessCategory(workspace);
  const base = TERMINOLOGY[category] || TERMINOLOGY.OTHER;
  const statusLabels = STATUS_LABELS[category] || STATUS_LABELS.OTHER;

  // Optional custom work-label override (Preferences). Applied only when both
  // singular + plural are provided, to avoid half-overridden labels.
  const sOverride = workspace?.custom_work_label_singular?.trim();
  const pOverride = workspace?.custom_work_label_plural?.trim();
  if (sOverride && pOverride) {
    const s = sOverride;
    const p = pOverride;
    return {
      ...base,
      workItemSingular: s,
      workItemPlural: p,
      createWorkItemLabel: `Create ${s}`,
      editWorkItemLabel: `Edit ${s}`,
      viewWorkItemLabel: `View ${s}`,
      addWorkItemLabel: `Add ${s}`,
      workItemDetailsLabel: `${s} Details`,
      workItemTitleLabel: `${s} Title`,
      activeWorkLabel: `Active ${p}`,
      totalWorkLabel: `Total ${p}`,
      completedWorkLabel: `Completed ${p}`,
      profitabilityLabel: `${s} Profitability`,
      financialSummaryLabel: `${s} Financial Summary`,
      searchPlaceholder: `Search ${p.toLowerCase()}...`,
      clientWorkLabel: `Client ${p}`,
      exportPrefix: p,
      emptyTitle: `No ${p.toLowerCase()} yet`,
      emptyDescription: `Create your first ${s.toLowerCase()} to get started.`,
      statusLabels,
      category
    };
  }

  return { ...base, statusLabels, category };
}

// Resolve the display label for an internal Event status value.
export function statusDisplayLabel(workspace, status) {
  const term = getBusinessTerminology(workspace);
  return term.statusLabels[status] || status;
}