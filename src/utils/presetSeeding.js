// Preset seeding utility — applies industry-specific default team roles,
// services, and expense categories to a NEW workspace after creation.
// Presets are starter data only; users can add/edit/disable/remove them later.
//
// IDEMPOTENT: Uses name-matching to prevent duplicates. If seeding runs twice
// (e.g. onboarding retried), only records with names that don't already exist
// in this workspace are created. Existing records are never duplicated.

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

  // ─── Seed Team Roles (name-matched idempotency) ───
  const rolePresets = getTeamRolePresets(businessCategory);
  if (rolePresets.length > 0) {
    try {
      const existingRoles = await base44.entities.TeamRole.filter(
        { workspace_id: workspaceId },
        "-created_date",
        100
      );
      const existingNames = new Set((existingRoles || []).map((r) => r.name));
      const rolesToCreate = rolePresets
        .filter((r) => !existingNames.has(r.name))
        .map((r) => ({
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
    } catch {
      /* non-blocking — user can add roles manually */
    }
  }

  // ─── Seed Services (name-matched idempotency) ───
  const servicePresets = getServicePresets(businessCategory);
  if (servicePresets.length > 0) {
    try {
      const existingServices = await base44.entities.Service.filter(
        { workspace_id: workspaceId },
        "-created_date",
        100
      );
      const existingNames = new Set((existingServices || []).map((s) => s.name));
      const servicesToCreate = servicePresets
        .filter((s) => !existingNames.has(s.name))
        .map((s) => ({
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
    } catch {
      /* non-blocking — user can add services manually */
    }
  }

  // ─── Seed Expense Categories (name-matched idempotency, shared across all categories) ───
  try {
    const existingCats = await base44.entities.ExpenseCategory.filter(
      { workspace_id: workspaceId },
      "-created_date",
      100
    );
    const existingNames = new Set((existingCats || []).map((c) => c.name));
    const catsToCreate = EXPENSE_CATEGORY_PRESETS.filter(
      (c) => !existingNames.has(c.name)
    ).map((c) => ({
      workspace_id: workspaceId,
      name: c.name,
      status: "active",
    }));
    if (catsToCreate.length > 0) {
      await base44.entities.ExpenseCategory.bulkCreate(catsToCreate);
      categoriesSeeded = catsToCreate.length;
    }
  } catch {
    /* non-blocking — user can add categories manually */
  }

  return { roles: rolesSeeded, services: servicesSeeded, categories: categoriesSeeded };
}