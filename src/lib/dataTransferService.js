// ============================================================
// Data Transfer Service — Export / Import workspace data
// ============================================================
// Exports all workspace-scoped entities to a JSON file (backup or migration).
// Imports a JSON file back into the database (restore or migrate).
// ============================================================

import { supabase } from '@/lib/supabaseClient';

const ENTITY_TABLE_MAP = {
  Workspace: 'workspaces',
  WorkspaceMember: 'workspace_members',
  Client: 'clients',
  Lead: 'leads',
  Event: 'events',
  TeamMember: 'team_members',
  TeamRole: 'team_roles',
  Service: 'services',
  ServiceProvider: 'service_providers',
  EventTeamAssignment: 'event_team_assignments',
  EventServiceAssignment: 'event_service_assignments',
  EventDayAssignment: 'event_day_assignments',
  TeamBlockDate: 'team_block_dates',
  EventReminder: 'event_reminders',
  Quotation: 'quotations',
  QuotationItem: 'quotation_items',
  QuotationPackage: 'quotation_packages',
  QuotationPortal: 'quotation_portals',
  PaymentMilestone: 'payment_milestones',
  Invoice: 'invoices',
  InvoiceItem: 'invoice_items',
  FinancialYear: 'financial_years',
  FinancialTransaction: 'financial_transactions',
  ExpenseCategory: 'expense_categories',
  JobSheet: 'job_sheets',
  JobSheetPortal: 'job_sheet_portals',
  Notification: 'notifications',
  SupportTicket: 'support_tickets',
  WorkspaceSubscription: 'workspace_subscriptions',
  SubscriptionPayment: 'subscription_payments',
  UpgradeRequest: 'upgrade_requests',
  StorageUsage: 'storage_usage',
};

// Workspace-scoped entities in dependency order (parents before children)
const WORKSPACE_SCOPED_ENTITIES = [
  'Client',
  'Lead',
  'TeamMember',
  'TeamRole',
  'Service',
  'ServiceProvider',
  'ExpenseCategory',
  'FinancialYear',
  'Event',
  'EventTeamAssignment',
  'EventServiceAssignment',
  'EventDayAssignment',
  'EventReminder',
  'TeamBlockDate',
  'Quotation',
  'QuotationItem',
  'QuotationPackage',
  'QuotationPortal',
  'PaymentMilestone',
  'Invoice',
  'InvoiceItem',
  'FinancialTransaction',
  'JobSheet',
  'JobSheetPortal',
  'Notification',
  'SupportTicket',
  'WorkspaceSubscription',
  'SubscriptionPayment',
  'UpgradeRequest',
  'StorageUsage',
  'WorkspaceMember',
];

/**
 * Export all workspace-scoped data to a JSON object.
 * @param {string} workspaceId
 * @param {function} onProgress(entityName, current, total)
 */
export async function exportWorkspaceData(workspaceId, onProgress) {
  const result = {
    _meta: {
      app: 'kramasha',
      exported_at: new Date().toISOString(),
      workspace_id: workspaceId,
      entity_count: WORKSPACE_SCOPED_ENTITIES.length,
    },
    entities: {},
  };

  let totalRecords = 0;

  for (let i = 0; i < WORKSPACE_SCOPED_ENTITIES.length; i++) {
    const entityName = WORKSPACE_SCOPED_ENTITIES[i];
    const tableName = ENTITY_TABLE_MAP[entityName];

    if (onProgress) onProgress(entityName, i + 1, WORKSPACE_SCOPED_ENTITIES.length);

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) {
      console.warn(`Export ${entityName}: ${error.message}`);
      result.entities[entityName] = [];
    } else {
      result.entities[entityName] = data || [];
      totalRecords += (data || []).length;
    }
  }

  result._meta.total_records = totalRecords;
  return result;
}

/**
 * Import data from a JSON object into the database.
 * @param {object} json — the parsed JSON from export
 * @param {string} mode — 'upsert' (insert or update) or 'insert' (skip conflicts)
 * @param {function} onProgress(entityName, current, total)
 */
export async function importData(json, mode = 'upsert', onProgress) {
  const results = {};
  const entityNames = Object.keys(json.entities || {}).filter(
    (name) => ENTITY_TABLE_MAP[name] && name !== 'WorkspaceMember' // skip members for safety
  );

  for (let i = 0; i < entityNames.length; i++) {
    const entityName = entityNames[i];
    const tableName = ENTITY_TABLE_MAP[entityName];
    const records = json.entities[entityName];

    if (!records || records.length === 0) {
      results[entityName] = { total: 0, success: 0, failed: 0, errors: [] };
      continue;
    }

    if (onProgress) onProgress(entityName, i + 1, entityNames.length);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .upsert(records, { onConflict: 'id', ignoreDuplicates: mode === 'insert' });

      if (error) {
        results[entityName] = {
          total: records.length,
          success: 0,
          failed: records.length,
          errors: [error.message],
        };
      } else {
        results[entityName] = {
          total: records.length,
          success: records.length,
          failed: 0,
          errors: [],
        };
      }
    } catch (err) {
      results[entityName] = {
        total: records.length,
        success: 0,
        failed: records.length,
        errors: [err.message],
      };
    }
  }

  return results;
}

/**
 * Download a JSON object as a file.
 */
export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a File object and parse as JSON.
 */
export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        resolve(JSON.parse(event.target.result));
      } catch (err) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export { WORKSPACE_SCOPED_ENTITIES, ENTITY_TABLE_MAP };