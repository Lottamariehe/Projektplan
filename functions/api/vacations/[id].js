/* =========================================================
   PUT    /api/vacations/:id – Urlaubszeitraum bearbeiten
   DELETE /api/vacations/:id – Urlaubszeitraum löschen
   Urlaub ist laufende Planungsdatenpflege (wie das Verschieben
   eines Projektbalkens) und daher - anders als das endgültige
   Löschen von Mitarbeitern/Projekten - nicht auf Administratoren
   beschränkt.
   ========================================================= */

import { json, errorResponse, buildUpdate } from "../_utils.js";

const UPDATABLE_FIELDS = ["employeeId", "startYear", "startWeek", "endYear", "endWeek", "bemerkung", "updatedAt"];

export async function onRequestPut(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const id = context.params.id;
  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }

  if (!body.updatedAt) body.updatedAt = new Date().toISOString();
  const update = buildUpdate("vacations", id, body, UPDATABLE_FIELDS);
  if (!update) return errorResponse("Keine gültigen Felder zum Aktualisieren übergeben.");

  try {
    const result = await db.prepare(update.sql).bind(...update.values).run();
    if (result.meta && result.meta.changes === 0) {
      return errorResponse("Urlaubseintrag mit dieser ID wurde nicht gefunden.", 404);
    }
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Update fehlgeschlagen: " + err.message, 500);
  }
}

export async function onRequestDelete(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const id = context.params.id;
  try {
    await db.prepare("DELETE FROM vacations WHERE id = ?").bind(id).run();
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Löschen fehlgeschlagen: " + err.message, 500);
  }
}
