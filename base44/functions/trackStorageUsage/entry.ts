import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolvePlanContext, verifyWorkspaceMembership, UNLIMITED } from '../../shared/planEngine.ts';

// Tracks per-workspace file storage usage against the plan's storage limit.
// Actions: "get" | "check" | "add" | "remove"
//   get    → returns current usage + plan limit
//   check  → { file_size_bytes } → returns { allowed } without mutating
//   add    → { file_size_bytes } → increments usage (call AFTER successful upload)
//   remove → { file_size_bytes } → decrements usage (call when a file is deleted)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { workspace_id, action, file_size_bytes } = body || {};

    if (!workspace_id) return Response.json({ error: 'workspace_id is required' }, { status: 400 });
    if (!action) return Response.json({ error: 'action is required' }, { status: 400 });

    // Verify the user belongs to this workspace.
    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) return Response.json({ error: 'Not a member of this workspace' }, { status: 403 });

    // Resolve the plan to get the storage limit (in GB).
    const planCtx = await resolvePlanContext(base44, workspace_id);
    const limitBytes = (planCtx.storageGb || 0) * 1024 * 1024 * 1024;

    // Find or create the usage record for this workspace (service-role, bypasses RLS).
    const existing = await base44.asServiceRole.entities.StorageUsage.filter({ workspace_id });
    let record = (existing && existing[0]) || null;

    if (!record) {
      record = await base44.asServiceRole.entities.StorageUsage.create({
        workspace_id,
        total_bytes: 0,
        file_count: 0
      });
    }

    if (action === 'get') {
      return Response.json({
        total_bytes: record.total_bytes || 0,
        file_count: record.file_count || 0,
        limit_bytes: limitBytes,
        storage_gb: planCtx.storageGb || 0,
        plan_code: planCtx.planCode
      });
    }

    const size = Number(file_size_bytes) || 0;

    if (action === 'check') {
      const projected = (record.total_bytes || 0) + size;
      // limitBytes <= 0 means no storage limit configured → treat as unlimited.
      const allowed = limitBytes <= 0 ? true : projected <= limitBytes;
      return Response.json({
        allowed,
        current_bytes: record.total_bytes || 0,
        limit_bytes: limitBytes,
        projected_bytes: projected
      });
    }

    if (action === 'add') {
      const projected = (record.total_bytes || 0) + size;
      if (limitBytes > 0 && projected > limitBytes) {
        return Response.json({
          allowed: false,
          error: 'Storage limit exceeded for your plan',
          current_bytes: record.total_bytes || 0,
          limit_bytes: limitBytes
        }, { status: 402 });
      }
      const updated = await base44.asServiceRole.entities.StorageUsage.update(record.id, {
        total_bytes: projected,
        file_count: (record.file_count || 0) + 1
      });
      return Response.json({
        allowed: true,
        total_bytes: updated.total_bytes,
        file_count: updated.file_count,
        limit_bytes: limitBytes
      });
    }

    if (action === 'remove') {
      const newBytes = Math.max(0, (record.total_bytes || 0) - size);
      const newCount = Math.max(0, (record.file_count || 0) - 1);
      const updated = await base44.asServiceRole.entities.StorageUsage.update(record.id, {
        total_bytes: newBytes,
        file_count: newCount
      });
      return Response.json({
        total_bytes: updated.total_bytes,
        file_count: updated.file_count,
        limit_bytes: limitBytes
      });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}