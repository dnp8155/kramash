import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { round2 } from '../../shared/quotationHelpers.ts';

// Authenticated endpoint for client-role users.
// Returns all events, quotations, invoices, and payment history for the logged-in client.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve linked client + workspace
    let clientId = user.linked_client_id || '';
    let workspaceId = user.linked_workspace_id || '';
    let wasAutoLinked = false;

    // If the user is not yet role "client", try to auto-link by email.
    // This handles the case where inviteUser created the user with role "user"
    // and the inviteClientToPortal function couldn't update the role immediately.
    if (user.role !== 'client' || !clientId) {
      const clients = await base44.asServiceRole.entities.Client.filter({ email: user.email }, '-created_date', 10);
      if (clients && clients.length > 0) {
        clientId = clients[0].id;
        workspaceId = clients[0].workspace_id || workspaceId;

        // Upgrade the user's role to "client" and persist the link
        try {
          await base44.asServiceRole.entities.User.update(user.id, {
            role: 'client',
            linked_client_id: clientId,
            linked_workspace_id: workspaceId
          });
          wasAutoLinked = true;
        } catch (e) {
          // If we can't update the role, continue anyway — we have the client link
        }
      }
    }

    if (!clientId || !workspaceId) {
      return Response.json({
        error: 'Your account is not linked to any client record. Please contact your service provider to invite you to the portal.'
      }, { status: 404 });
    }

    // Fetch workspace info
    let workspace = null;
    try {
      workspace = await base44.asServiceRole.entities.Workspace.get(workspaceId);
    } catch (e) { /* continue without workspace info */ }

    const currency = workspace?.currency || 'INR';

    // Fetch all events for this client
    const events = await base44.asServiceRole.entities.Event.filter(
      { workspace_id: workspaceId, client_id: clientId },
      '-start_date', 200
    );

    // Fetch all quotations for this client
    const quotations = await base44.asServiceRole.entities.Quotation.filter(
      { workspace_id: workspaceId, client_id: clientId },
      '-created_date', 200
    );

    // Fetch all invoices for this client
    const invoices = await base44.asServiceRole.entities.Invoice.filter(
      { workspace_id: workspaceId, client_id: clientId },
      '-created_date', 200
    );

    // Fetch all client receipts (payments)
    const transactions = await base44.asServiceRole.entities.FinancialTransaction.filter(
      { workspace_id: workspaceId, client_id: clientId, transaction_type: 'CLIENT_RECEIPT', status: 'ACTIVE' },
      '-transaction_date', 500
    );

    // Calculate summary totals
    const totalQuoted = (quotations || [])
      .filter((q) => q.status === 'accepted' || q.status === 'finalized')
      .reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0);

    const totalInvoiced = (invoices || [])
      .reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);

    const totalPaid = (transactions || [])
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const balanceDue = Math.max(0, round2(totalInvoiced - totalPaid));

    // Build response
    return Response.json({
      auto_linked: wasAutoLinked,
      client: {
        id: clientId,
        name: (await base44.asServiceRole.entities.Client.get(clientId))?.name || user.full_name || user.email,
        email: user.email
      },
      workspace: {
        id: workspaceId,
        name: workspace?.name || '',
        logo: workspace?.logo || '',
        phone: workspace?.phone || '',
        email: workspace?.email || '',
        currency
      },
      summary: {
        totalEvents: (events || []).length,
        totalQuoted: round2(totalQuoted),
        totalInvoiced: round2(totalInvoiced),
        totalPaid: round2(totalPaid),
        balanceDue: round2(balanceDue)
      },
      events: (events || []).map((e) => ({
        id: e.id,
        title: e.title || '',
        event_type: e.event_type || '',
        start_date: e.start_date || '',
        end_date: e.end_date || '',
        venue: e.venue || '',
        status: e.status || 'upcoming',
        contract_value: Number(e.contract_value) || 0
      })),
      quotations: (quotations || []).map((q) => ({
        id: q.id,
        quotation_number: q.quotation_number || '',
        quotation_date: q.quotation_date || '',
        status: q.status || 'draft',
        grand_total: Number(q.grand_total) || 0,
        public_token: q.public_token || '',
        public_link_enabled: !!q.public_link_enabled,
        project_title: q.project_title || ''
      })),
      invoices: (invoices || []).map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number || '',
        invoice_date: inv.invoice_date || '',
        due_date: inv.due_date || '',
        status: inv.status || 'draft',
        grand_total: Number(inv.grand_total) || 0,
        amount_paid: Number(inv.amount_paid) || 0,
        balance_due: Number(inv.balance_due) || 0,
        public_token: inv.public_token || '',
        public_link_enabled: !!inv.public_link_enabled
      })),
      transactions: (transactions || []).map((t) => ({
        id: t.id,
        amount: Number(t.amount) || 0,
        payment_method: t.payment_method || '',
        transaction_date: t.transaction_date || '',
        reference_number: t.reference_number || ''
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}