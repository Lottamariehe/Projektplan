/* =========================================================
   PUT    /api/projects/:id – Projekt aktualisieren
          (inkl. Mitarbeiter-Zuordnung und Tags, falls mitgeschickt)
   DELETE /api/projects/:id – Projekt ENDGÜLTIG löschen
          (nur Administratoren – kritische Aktion)
   ========================================================= */

import { json, errorResponse, buildUpdate, requireAdmin } from "../_utils.js";

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

  const statements = [];
  if (update) statements.push(db.prepare(update.sql).bind(...update.values));

  const hasEmployeeIds = Array.isArray(body.employeeIds);
  const hasTags = Array.isArray(body.tags);
  const employeeRanges = body.employeeRanges && typeof body.employeeRanges === "object" ? body.employeeRanges : {};

  if (hasEmployeeIds) {
    statements.push(db.prepare("DELETE FROM project_employees WHERE projectId = ?").bind(id));
    body.employeeIds.forEach((empId) => {
      const r = employeeRanges[empId] || {};
      statements.push(
        db.prepare(
          "INSERT INTO project_employees (projectId, employeeId, startYear, startWeek, endYear, endWeek) VALUES (?,?,?,?,?,?)"
        ).bind(id, empId, r.startYear || null, r.startWeek || null, r.endYear || null, r.endWeek || null)
      );
    });
  }
  if (hasTags) {
    statements.push(db.prepare("DELETE FROM project_tags WHERE projectId = ?").bind(id));
    body.tags.forEach((tag) => {
      statements.push(db.prepare("INSERT INTO project_tags (projectId, tag) VALUES (?, ?)").bind(id, tag));
    });
  }

  if (!statements.length) return errorResponse("Keine gültigen Felder zum Aktualisieren übergeben.");

  try {
    await db.batch(statements);
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
      db.prepare("DELETE FROM project_employees WHERE projectId = ?").bind(id),
      db.prepare("DELETE FROM project_tags WHERE projectId = ?").bind(id),
      db.prepare("UPDATE tenders SET linkedProjectId = NULL WHERE linkedProjectId = ?").bind(id),
      db.prepare("DELETE FROM projects WHERE id = ?").bind(id)
    ]);
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Löschen fehlgeschlagen: " + err.message, 500);
  }
}
