/* =========================================================
   GET /api/admin/config – liefert, ob der aktuelle Nutzer Admin
   ist. Die vollständige Admin-Liste wird nur an Admins selbst
   zurückgegeben (damit normale Nutzer die Adressen nicht sehen).

   PUT /api/admin/config – ändert die Admin-E-Mail-Adressen.
   Nur für Administratoren (serverseitig geprüft).
   ========================================================= */

import { json, errorResponse, currentUserEmail, getAdminEmails, isAdminEmail, requireAdmin } from "../_utils.js";

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const email = currentUserEmail(context.request);
  const admins = await getAdminEmails(db);
  const admin = isAdminEmail(email, admins);

  return json({
    email: email || null,
    isAdmin: admin,
    adminEmails: admin ? admins : []
  });
}

export async function onRequestPut(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const forbidden = await requireAdmin(context);
  if (forbidden) return forbidden;

  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }

  if (!body || !Array.isArray(body.adminEmails) || !body.adminEmails.length) {
    return errorResponse("adminEmails muss eine nicht-leere Liste von E-Mail-Adressen sein.");
  }
  const cleaned = body.adminEmails
    .map((e) => String(e).trim())
    .filter(Boolean);
  if (!cleaned.length) return errorResponse("Mindestens eine gültige Admin-E-Mail-Adresse ist erforderlich.");

  try {
    await db.prepare(
      `INSERT INTO admin_config (id, adminEmails) VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET adminEmails = excluded.adminEmails`
    ).bind(JSON.stringify(cleaned)).run();
    return json({ ok: true, adminEmails: cleaned });
  } catch (err) {
    return errorResponse("Speichern der Admin-Konfiguration fehlgeschlagen: " + err.message, 500);
  }
}
