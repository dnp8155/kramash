import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { safeJson } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { signature, signed_by_name, consent } = body;
    const token = body.public_token || body.token;

    if (!token) return Response.json({ error: "Quotation token required" }, { status: 400 });
    if (!signature || typeof signature !== "string" || !signature.startsWith("data:image")) {
      return Response.json({ error: "A valid signature is required" }, { status: 400 });
    }
    if (!signed_by_name || !signed_by_name.trim()) return Response.json({ error: "Your name is required to sign" }, { status: 400 });
    if (!consent) return Response.json({ error: "You must agree to the terms before signing" }, { status: 400 });

    const list = await base44.asServiceRole.entities.Quotation.filter({ public_token: token }, "-created_date", 5);
    const q = (list && list.length > 0) ? list[0] : null;
    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });

    const todayStr = new Date().toISOString().slice(0, 10);
    if (q.valid_until && q.valid_until < todayStr) {
      return Response.json({ error: "This quotation has expired and can no longer be signed." }, { status: 403 });
    }
    if (q.status === "accepted" && q.signed_at) {
      return Response.json({ error: "This quotation has already been signed.", already_signed: true }, { status: 409 });
    }
    if (q.status !== "finalized" && q.status !== "accepted") {
      return Response.json({ error: "This quotation cannot be signed yet." }, { status: 403 });
    }

    if (q.client_access_password) {
      const { email, password } = body;
      if (!password || password !== q.client_access_password) {
        return Response.json({ error: "Authentication required to sign this quotation" }, { status: 401 });
      }
      const snap = safeJson(q.client_snapshot) || {};
      const clientEmail = (snap.email || "").trim().toLowerCase();
      if (clientEmail && (!email || email.trim().toLowerCase() !== clientEmail)) {
        return Response.json({ error: "Authentication required to sign this quotation" }, { status: 401 });
      }
    }

    const updated = await base44.asServiceRole.entities.Quotation.update(q.id, {
      status: "accepted", client_signature: signature,
      signed_by_name: signed_by_name.trim(), signed_at: new Date().toISOString(),
      sync_pending: true
    });

    return Response.json({
      ok: true,
      quotation: {
        status: updated.status, signed_by_name: updated.signed_by_name,
        signed_at: updated.signed_at, client_signature: updated.client_signature
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}