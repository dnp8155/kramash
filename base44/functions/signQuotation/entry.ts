import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public endpoint: a client signs (accepts) a finalized quotation online.
// Records the signature image (data URL) or typed name, timestamp, and
// marks the quotation as accepted. Only finalized/accepted quotations can be signed.
// Supports lookup by public_token (preferred) or quotation_id (fallback).
// Server-side checks: expiry, already-signed, status.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { signature, signed_by_name, consent } = body;
    const token = body.public_token || body.token;
    const quotationId = body.quotation_id;

    if (!signature || typeof signature !== "string" || !signature.startsWith("data:image")) {
      return Response.json({ error: "A valid signature is required" }, { status: 400 });
    }
    if (!signed_by_name || !signed_by_name.trim()) {
      return Response.json({ error: "Your name is required to sign" }, { status: 400 });
    }
    if (!consent) {
      return Response.json({ error: "You must agree to the terms before signing" }, { status: 400 });
    }

    let q = null;
    if (token) {
      const list = await base44.asServiceRole.entities.Quotation.filter(
        { public_token: token }, "-created_date", 5
      );
      if (list && list.length > 0) q = list[0];
    } else if (quotationId) {
      try { q = await base44.asServiceRole.entities.Quotation.get(quotationId); } catch (e) { /* not found */ }
    } else {
      return Response.json({ error: "Quotation token or id required" }, { status: 400 });
    }

    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });

    // Server-side expiry check
    const todayStr = new Date().toISOString().slice(0, 10);
    if (q.valid_until && q.valid_until < todayStr) {
      return Response.json({ error: "This quotation has expired and can no longer be signed." }, { status: 403 });
    }

    // Only finalized quotations can be signed (accepted = already signed)
    if (q.status === "accepted" && q.signed_at) {
      return Response.json({ error: "This quotation has already been signed.", already_signed: true }, { status: 409 });
    }
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

    const updated = await base44.asServiceRole.entities.Quotation.update(q.id, {
      status: "accepted",
      client_signature: signature,
      signed_by_name: signed_by_name.trim(),
      signed_at: new Date().toISOString(),
      sync_pending: true
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