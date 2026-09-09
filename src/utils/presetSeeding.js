// Preset seeding utility — applies industry-specific default team roles,
// services, and expense categories to a NEW workspace after creation.
// Presets are starter data only; users can add/edit/disable/remove them later.
// This function is safe to call multiple times — it checks for existing data
// and only seeds when the workspace has no roles/services/categories yet.

import { base44 } from "@/api/base44Client";
import {
  getTeamRolePresets,
  getServicePresets,
  EXPENSE_CATEGORY_PRESETS,
} from "@/constants/industryPresets";

export async function seedWorkspacePresets(workspaceId, businessCategory) {
  if (!workspaceId || !businessCategory) return { roles: 0, services: 0, categories: 0 };

  let rolesSeeded = 0;
  let servicesSeeded = 0;
  let categoriesSeeded = 0;

  // ─── Seed Team Roles (only if workspace has none yet) ───
  const rolePresets = getTeamRolePresets(businessCategory);
  if (rolePresets.length > 0) {
    try {
      const existingRoles = await base44.entities.TeamRole.filter(
        { workspace_id: workspaceId },
        "-created_date",
        100
      );
      if (!existingRoles || existingRoles.length === 0) {
        const rolesToCreate = rolePresets.map((r) => ({
          workspace_id: workspaceId,
          name: r.name,
          default_rate: r.default_rate,
          rate_type: r.rate_type,
          status: "active",
        }));
        if (rolesToCreate.length > 0) {
          await base44.entities.TeamRole.bulkCreate(rolesToCreate);
          rolesSeeded = rolesToCreate.length;
        }
      }
    } catch {
      /* non-blocking — user can add roles manually */
    }
  }

  // ─── Seed Services (only if workspace has none yet) ───
  const servicePresets = getServicePresets(businessCategory);
  if (servicePresets.length > 0) {
    try {
      const existingServices = await base44.entities.Service.filter(
        { workspace_id: workspaceId },
        "-created_date",
        100
      );
      if (!existingServices || existingServices.length === 0) {
        const servicesToCreate = servicePresets.map((s) => ({
          workspace_id: workspaceId,
          name: s.name,
          default_rate: s.default_rate,
          rate_type: s.rate_type,
          status: "active",
        }));
        if (servicesToCreate.length > 0) {
          await base44.entities.Service.bulkCreate(servicesToCreate);
          servicesSeeded = servicesToCreate.length;
        }
      }
    } catch {
      /* non-blocking — user can add services manually */
    }
  }

  // ─── Seed Expense Categories (shared across all categories, only if none exist) ───
  try {
    const existingCats = await base44.entities.ExpenseCategory.filter(
      { workspace_id: workspaceId },
      "-created_date",
      100
    );
    if (!existingCats || existingCats.length === 0) {
      const catsToCreate = EXPENSE_CATEGORY_PRESETS.map((c) => ({
        workspace_id: workspaceId,
        name: c.name,
        status: "active",
      }));
      if (catsToCreate.length > 0) {
        await base44.entities.ExpenseCategory.bulkCreate(catsToCreate);
        categoriesSeeded = catsToCreate.length;
      }
    }
  } catch {
    /* non-blocking — user can add categories manually */
  }

  return { roles: rolesSeeded, services: servicesSeeded, categories: categoriesSeeded };
}