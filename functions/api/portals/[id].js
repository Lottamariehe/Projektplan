/* =========================================================
   PUT    /api/portals/:id – Vergabeportal bearbeiten
   DELETE /api/portals/:id – Vergabeportal ENDGÜLTIG löschen
          (nur Administratoren – kritische Aktion)
   ========================================================= */

import { json, errorResponse, buildUpdate, requireAdmin } from "../_utils.js";

const UPDATABLE_FIELDS = ["name", "url", "hinweis", "updatedAt"];

export async function onRequestPut(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const id = context.params.id;
  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }
  if (!body.updatedAt) body.updatedAt = new Date().toISOString();

  const update = buildUpdate("portals", id, body, UPDATABLE_FIELDS);
  if (!update) return errorResponse("Keine gültigen Felder zum Aktualisieren übergeben.");

  try {
    const result = await db.prepare(update.sql).bind(...update.values).run();
    if (result.meta && result.meta.changes === 0) {
      return errorResponse("Vergabeportal mit dieser ID wurde nicht gefunden.", 404);
    }
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Update fehlgeschlagen: " + err.message, 500);
  }
}

export async function onRequestDelete(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const forbidden = await requireAdmin(context);
  if (forbidden) return forbidden;

  const id = context.params.id;
  try {
    await db.batch([
      db.prepare("UPDATE tenders SET portalId = NULL WHERE portalId = ?").bind(id),
      db.prepare("DELETE FROM portals WHERE id = ?").bind(id)
    ]);
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Löschen fehlgeschlagen: " + err.message, 500);
  }
}
