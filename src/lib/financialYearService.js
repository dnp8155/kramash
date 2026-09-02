// Central Financial Year service: workspace-scoped FY management,
// transaction-to-FY linkage, and validation.
// All financial records must reference a FinancialYear via financial_year_id.

import { base44 } from "@/api/base44Client";
import {
  currentFinancialYearLabel,
  financialYearRange
} from "@/constants/financeConfig";

// ---- Ensure default FY exists for a workspace ----

// Ensures the workspace has at least the current applicable FY.
// Creates it if missing. Sets it active if no active FY exists.
// Returns the full FY list for the workspace.
export async function ensureDefaultFY(workspaceId) {
  if (!workspaceId) return [];
  let existing = await base44.entities.FinancialYear.filter(
    { workspace_id: workspaceId }, "-start_date", 100
  );
  existing = existing || [];

  const currentLabel = currentFinancialYearLabel();
  const range = financialYearRange(currentLabel);
  if (!range) return existing;

  // Normalised fy_id (no space): "FY2026-27"
  const fyId = currentLabel.replace("FY ", "FY");
  const label = `April ${range.start.slice(0, 4)} - March ${range.end.slice(0, 4)}`;

  const existingCurrent = existing.find(
    (f) => f.fy_id === fyId || (f.start_date === range.start && f.end_date === range.end)
  );

  const hasActive = existing.some((f) => f.is_active);

  if (existingCurrent) {
    if (!hasActive) {
      await base44.entities.FinancialYear.update(existingCurrent.id, { is_active: true });
      existingCurrent.is_active = true;
    }
    return existing;
  }

  // Create the current FY
  await base44.entities.FinancialYear.create({
    workspace_id: workspaceId,
    fy_id: fyId,
    label,
    start_date: range.start,
    end_date: range.end,
    is_active: !hasActive,
    status: "open"
  });

  const refreshed = await base44.entities.FinancialYear.filter(
    { workspace_id: workspaceId }, "-start_date", 100
  );
  // Deduplicate: if race conditions created multiple records with the same
  // fy_id, keep the active one (or first) and delete the rest.
  return dedupeFYs(refreshed || []);
}

// Remove duplicate FY records (same fy_id), keeping the active one.
async function dedupeFYs(fys) {
  const byFyId = {};
  for (const fy of fys) {
    if (!byFyId[fy.fy_id]) byFyId[fy.fy_id] = [];
    byFyId[fy.fy_id].push(fy);
  }
  for (const [fyId, records] of Object.entries(byFyId)) {
    if (records.length > 1) {
      const keep = records.find(r => r.is_active) || records[0];
      for (const r of records) {
        if (r.id !== keep.id) {
          try { await base44.entities.FinancialYear.delete(r.id); } catch (e) {}
        }
      }
    }
  }
  return fys.filter(f => {
    const records = byFyId[f.fy_id];
    const keep = records.find(r => r.is_active) || records[0];
    return f.id === keep.id;
  });
}

// ---- FY resolution ----

// Find the FY record whose date range contains the given ISO date.
export function resolveFYForDate(dateISO, fiscalYears) {
  if (!dateISO || !fiscalYears || !fiscalYears.length) return null;
  for (const fy of fiscalYears) {
    if (dateISO >= fy.start_date && dateISO <= fy.end_date) return fy;
  }
  return null;
}

// Check if a transaction belongs to a given FY.
// Uses financial_year_id if present; falls back to date-range for unmigrated records.
export function txInFY(tx, fy) {
  if (!fy) return true;
  if (tx.financial_year_id) return tx.financial_year_id === fy.id;
  const d = tx.transaction_date;
  return d >= fy.start_date && d <= fy.end_date;
}

// ---- Active FY management ----

// Set one FY as the workspace active/default. Deactivates all others.
export async function setActiveFY(workspaceId, fyId) {
  if (!workspaceId || !fyId) return;
  await base44.entities.FinancialYear.updateMany(
    { workspace_id: workspaceId, is_active: true },
    { $set: { is_active: false } }
  );
  await base44.entities.FinancialYear.update(fyId, { is_active: true });
}

// ---- Delete protection ----

// Check whether any transaction belongs to the given FY.
// Uses in-memory transaction list (already loaded by the page).
export function fyHasTransactions(fy, allTransactions) {
  if (!fy || !allTransactions) return false;
  return allTransactions.some((t) => txInFY(t, fy));
}

// ---- FY form validation ----

// Validate a new/edited FY: start < end, no overlap with existing FYs.
export async function validateFYRange(workspaceId, startDate, endDate, excludeId = null) {
  if (!startDate || !endDate) return { valid: false, error: "Both start and end dates are required." };
  if (startDate >= endDate) return { valid: false, error: "Start date must be before end date." };

  const existing = await base44.entities.FinancialYear.filter(
    { workspace_id: workspaceId }, "-start_date", 100
  );
  for (const fy of (existing || [])) {
    if (excludeId && fy.id === excludeId) continue;
    // Overlap test: start1 < end2 && start2 < end1
    if (startDate < fy.end_date && fy.start_date < endDate) {
      return { valid: false, error: `This period overlaps with ${fy.fy_id} (${fy.label}).` };
    }
  }
  return { valid: true };
}

// ---- Display helpers ----

// Consistent display label: "FY 2026-27"
export function fyDisplayLabel(fy) {
  if (!fy) return "";
  // Normalise: "FY2026-27" -> "FY 2026-27"
  const m = fy.fy_id?.match(/FY\s*(\d{4})-(\d{2})/);
  if (m) return `FY ${m[1]}-${m[2]}`;
  return fy.fy_id || fy.label || "";
}

// Convert a FY record to the short value format used by Event.financial_year
// e.g. "FY2026-27" -> "2026-27"
export function fyRecordValue(fy) {
  if (!fy || !fy.fy_id) return "";
  return fy.fy_id.replace(/^FY\s*/, "").trim();
}

// Derived display status: Active | Closed | Upcoming | Current
export function fyDisplayStatus(fy) {
  if (!fy) return "";
  if (fy.is_active) return "Active";
  if (fy.status === "closed") return "Closed";
  const today = new Date().toISOString().slice(0, 10);
  if (fy.end_date < today) return "Closed";
  if (fy.start_date > today) return "Upcoming";
  return "Current";
}

// Check if FY is closed (explicit or by date) — read-only for transactions.
export function isFYClosed(fy) {
  if (!fy) return false;
  if (fy.status === "closed") return true;
  const today = new Date().toISOString().slice(0, 10);
  return fy.end_date < today;
}