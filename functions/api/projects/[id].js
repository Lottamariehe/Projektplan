/* =========================================================
   PUT    /api/projects/:id – Projekt aktualisieren
   DELETE /api/projects/:id – Projekt löschen
   ========================================================= */

import { json, errorResponse, buildUpdate } from "../_utils.js";

const UPDATABLE_FIELDS = [
  "name", "auftraggeber", "adresse",
  "startYear", "startWeek", "endYear", "endWeek",
  "projektleiter", "obermonteur", "besetzung",
  "status", "farbe", "bemerkungen", "notizen", "updatedAt"
];

export async function onRequestPut(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const id = context.params.id;
  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }

  if (!body.updatedAt) body.updatedAt = new Date().toISOString();
  const update = buildUpdate("projects", id, body, UPDATABLE_FIELDS);
  if (!update) return errorResponse("Keine gültigen Felder zum Aktualisieren übergeben.");

  try {
    const result = await db.prepare(update.sql).bind(...update.values).run();
    if (result.meta && result.meta.changes === 0) {
      return errorResponse("Projekt mit dieser ID wurde nicht gefunden.", 404);
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
    await db.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Löschen fehlgeschlagen: " + err.message, 500);
  }
}
