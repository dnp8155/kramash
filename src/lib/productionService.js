import { base44 } from "@/api/base44Client";

export const PRODUCTION_STAGES = [
  { key: "pending", label: "Pending", color: "muted" },
  { key: "in_progress", label: "In Progress", color: "blue" },
  { key: "review", label: "Review", color: "amber" },
  { key: "delivered", label: "Delivered", color: "green" },
  { key: "on_hold", label: "On Hold", color: "red" }
];

export const TASK_TYPES = [
  { key: "raw_selection", label: "Raw Selection" },
  { key: "editing", label: "Editing" },
  { key: "color_grading", label: "Color Grading" },
  { key: "review", label: "Review" },
  { key: "album_design", label: "Album Design" },
  { key: "delivery", label: "Delivery" },
  { key: "revision", label: "Revision" },
  { key: "other", label: "Other" }
];

export const stageLabel = (stage) => PRODUCTION_STAGES.find((s) => s.key === stage)?.label || stage;
export const taskTypeLabel = (type) => TASK_TYPES.find((t) => t.key === type)?.label || type;

export async function createTask(data) {
  return base44.entities.ProductionTask.create(data);
}

export async function updateTask(id, data) {
  return base44.entities.ProductionTask.update(id, data);
}

export async function deleteTask(id) {
  return base44.entities.ProductionTask.delete(id);
}

export async function changeTaskStage(id, newStage, workspaceId) {
  const payload = { stage: newStage };
  if (newStage === "delivered") {
    payload.completed_at = new Date().toISOString();
  } else {
    payload.completed_at = "";
  }
  return base44.entities.ProductionTask.update(id, payload);
}