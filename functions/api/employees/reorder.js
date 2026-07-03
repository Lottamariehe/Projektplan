/* =========================================================
   PUT /api/employees/reorder – manuelle Sortierreihenfolge
   der Mitarbeiter speichern (Drag-and-drop in der
   Personaleinsatzplanung / Mitarbeiterverwaltung).

   body.order: string[] – Mitarbeiter-IDs in der gewünschten
   Reihenfolge. Es werden ausschließlich sortOrder-Werte
   (0..n-1) aktualisiert, sonst nichts.
   ========================================================= */

import { json, errorResponse } from "../_utils.js";

export async function onRequestPut(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }

  if (!body || !Array.isArray(body.order) || !body.order.length) {
    return errorResponse("Feld 'order' (Array von Mitarbeiter-IDs) ist erforderlich.");
  }

  try {
    const statements = body.order.map((id, i) =>
      db.prepare("UPDATE employees SET sortOrder = ? WHERE id = ?").bind(i, id)
    );
    await db.batch(statements);
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Sortierung speichern fehlgeschlagen: " + err.message, 500);
  }
}
