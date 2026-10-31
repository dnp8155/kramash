// Workspace-scoped Service Provider master list.
// Providers are external vendors/companies (e.g. "ABC Decorators", "Patel Sound & Light").
// Team members (including the workspace owner / SELF) are NOT stored here — they are
// referenced directly via TeamMember. This entity powers the autocomplete suggestion
// list and ensures custom-entered providers are saved for future reuse.

import { base44 } from "@/api/base44Client";

// Normalize: trim + collapse internal whitespace (for case-insensitive dedup)
export function normalizeProviderName(str) {
  return String(str || "").trim().replace(/\s+/g, " ");
}

// Load all active service providers for a workspace (sorted by name).
export async function loadServiceProviders(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.ServiceProvider.filter(
    { workspace_id: workspaceId }, "name", 500
  );
  return (list || []).filter((p) => p.status === "active");
}

// Find an existing provider by name (case-insensitive, trimmed).
export function findProviderByName(providers, name) {
  const n = normalizeProviderName(name).toLowerCase();
  if (!n) return null;
  return (providers || []).find((p) => normalizeProviderName(p.name).toLowerCase() === n) || null;
}

// Create a new service provider if one with the same name (case-insensitive) doesn't
// already exist. Returns the existing or newly created provider record.
export async function ensureServiceProvider(workspaceId, name, providers = []) {
  const normalizedName = normalizeProviderName(name);
  if (!normalizedName) return null;

  // Check the in-memory list first (avoids a duplicate API call in the common case)
  const existing = findProviderByName(providers, normalizedName);
  if (existing) return existing;

  // Double-check against the database in case the list is stale
  const dbExisting = await findProviderInDb(workspaceId, normalizedName);
  if (dbExisting) return dbExisting;

  const created = await base44.entities.ServiceProvider.create({
    workspace_id: workspaceId,
    name: normalizedName,
    status: "active"
  });
  return created;
}

// Query the database for a provider matching the given name (case-insensitive).
async function findProviderInDb(workspaceId, name) {
  const all = await loadServiceProviders(workspaceId);
  return findProviderByName(all, name);
}

// Build the combined suggestion list: team members (for SELF/owner) + service providers.
// Returns an array of { id, name, type, isSelf } objects, deduplicated by name.
export function buildProviderSuggestions(members = [], providers = []) {
  const seen = new Set();
  const result = [];

  // Team members first (SELF/owner should appear prominently)
  for (const m of members) {
    if (m.status === "inactive") continue;
    const name = normalizeProviderName(m.name);
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      result.push({ id: m.id, name, type: "member", isSelf: !!m.is_self });
    }
  }

  // Service providers
  for (const p of providers) {
    if (p.status === "inactive") continue;
    const name = normalizeProviderName(p.name);
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      result.push({ id: p.id, name, type: "provider", isSelf: false });
    }
  }

  return result.sort((a, b) => {
    // SELF always first
    if (a.isSelf && !b.isSelf) return -1;
    if (!a.isSelf && b.isSelf) return 1;
    return a.name.localeCompare(b.name);
  });
}