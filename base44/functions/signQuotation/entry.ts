import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public endpoint: a client signs (accepts) a finalized quotation online.
// Records the signature image (data URL), signer name, and timestamp, and
// marks the quotation as accepted. Only finalized/accepted quotations can be signed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { quotation_id, signature, signed_by_name } = body;
    if (!quotation_id) return Response.json({ error: "Quotation id required" }, { status: 400 });
    if (!signature || typeof signature !== "string" || !signature.startsWith("data:image")) {
      return Response.json({ error: "A valid signature is required" }, { status: 400 });
    }
    if (!signed_by_name || !signed_by_name.trim()) {
      return Response.json({ error: "Your name is required to sign" }, { status: 400 });
    }

    let q = null;
    try {
      q = await base44.asServiceRole.entities.Quotation.get(quotation_id);
    } catch (e) { /* not found */ }
    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });
    if (q.status !== "finalized" && q.status !== "accepted") {
      return Response.json({ error: "This quotation cannot be signed yet." }, { status: 403 });
    }

    // If quotation has an access password, validate client credentials.
    if (q.client_access_password) {
      const { email, password } = body;
      if (!password || password !== q.client_access_password) {
        return Response.json({ error: "Authentication required to sign this quotation" }, { status: 401 });
      }
      let clientEmail = "";
      try {
        const snap = JSON.parse(q.client_snapshot || "{}");
        clientEmail = (snap.email || "").trim().toLowerCase();
      } catch (e) { /* ignore */ }
      if (clientEmail && (!email || email.trim().toLowerCase() !== clientEmail)) {
        return Response.json({ error: "Authentication required to sign this quotation" }, { status: 401 });
      }
    }

    const updated = await base44.asServiceRole.entities.Quotation.update(quotation_id, {
      status: "accepted",
      client_signature: signature,
      signed_by_name: signed_by_name.trim(),
      signed_at: new Date().toISOString()
    });

    return Response.json({
      ok: true,
      quotation: {
        status: updated.status,
        signed_by_name: updated.signed_by_name,
        signed_at: updated.signed_at,
        client_signature: updated.client_signature
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}