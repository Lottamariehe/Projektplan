/* =========================================================
   PUT    /api/employees/:id – Mitarbeiter bearbeiten
          (für alle Nutzer erlaubt, z. B. aktiv/inaktiv setzen)
   DELETE /api/employees/:id – Mitarbeiter ENDGÜLTIG löschen
          (nur Administratoren – kritische Aktion)
   ========================================================= */

import { json, errorResponse, buildUpdate, requireAdmin } from "../_utils.js";

const UPDATABLE_FIELDS = [
  "vorname", "nachname", "funktion", "team", "qualifikation", "wochenarbeitszeit",
  "beschaeftigungsstatus", "sortOrder", "aktiv", "bemerkungen", "updatedAt"
];

export async function onRequestPut(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const id = context.params.id;
  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }

  if (Object.prototype.hasOwnProperty.call(body, "aktiv")) {
    body.aktiv = body.aktiv === false || body.aktiv === 0 ? 0 : 1;
  }
  if (!body.updatedAt) body.updatedAt = new Date().toISOString();

  const update = buildUpdate("employees", id, body, UPDATABLE_FIELDS);
  if (!update) return errorResponse("Keine gültigen Felder zum Aktualisieren übergeben.");

  try {
    const result = await db.prepare(update.sql).bind(...update.values).run();
    if (result.meta && result.meta.changes === 0) {
      return errorResponse("Mitarbeiter mit dieser ID wurde nicht gefunden.", 404);
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
      db.prepare("DELETE FROM project_employees WHERE employeeId = ?").bind(id),
      db.prepare("DELETE FROM assignment_periods WHERE employeeId = ?").bind(id),
      db.prepare("DELETE FROM vacations WHERE employeeId = ?").bind(id),
      db.prepare("DELETE FROM employees WHERE id = ?").bind(id)
    ]);
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Löschen fehlgeschlagen: " + err.message, 500);
  }
}
