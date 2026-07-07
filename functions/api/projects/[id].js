/* =========================================================
   PUT    /api/projects/:id – Projekt aktualisieren
          (inkl. Mitarbeiter-Zuordnung, Einsatzzeiträume,
          Bauabschnitte und Tags, falls mitgeschickt)
   DELETE /api/projects/:id – Projekt ENDGÜLTIG löschen
          (nur Administratoren – kritische Aktion)
   ========================================================= */

import { json, errorResponse, buildUpdate, requireAdmin } from "../_utils.js";

const UPDATABLE_FIELDS = [
  "name", "auftraggeber", "adresse",
  "startYear", "startWeek", "endYear", "endWeek",
  "projektleiter", "obermonteur", "besetzung",
  "status", "farbe", "projektart", "bemerkungen", "notizen", "updatedAt"
];

function genId(prefix) {
  return prefix + "_" + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 16) : String(Math.random()).slice(2));
}

export async function onRequestPut(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const id = context.params.id;
  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }

  if (!body.updatedAt) body.updatedAt = new Date().toISOString();
  const now = body.updatedAt;
  const update = buildUpdate("projects", id, body, UPDATABLE_FIELDS);

  const statements = [];
  if (update) statements.push(db.prepare(update.sql).bind(...update.values));

  const hasEmployeeIds = Array.isArray(body.employeeIds);
  const hasTags = Array.isArray(body.tags);
  const hasPhases = Array.isArray(body.phases);
  const assignmentPeriods = body.assignmentPeriods && typeof body.assignmentPeriods === "object" ? body.assignmentPeriods : {};

  if (hasEmployeeIds) {
    statements.push(db.prepare("DELETE FROM project_employees WHERE projectId = ?").bind(id));
    statements.push(db.prepare("DELETE FROM assignment_periods WHERE projectId = ?").bind(id));
    body.employeeIds.forEach((empId) => {
      statements.push(
        db.prepare("INSERT INTO project_employees (projectId, employeeId) VALUES (?, ?)").bind(id, empId)
      );
      const periods = Array.isArray(assignmentPeriods[empId]) ? assignmentPeriods[empId] : [];
      periods.forEach((p) => {
        if (!p.startYear || !p.startWeek || !p.endYear || !p.endWeek) return;
        statements.push(
          db.prepare(
            "INSERT INTO assignment_periods (id, projectId, employeeId, startYear, startWeek, endYear, endWeek, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)"
          ).bind(p.id || genId("asg"), id, empId, p.startYear, p.startWeek, p.endYear, p.endWeek, now, now)
        );
      });
    });
  }
  if (hasTags) {
    statements.push(db.prepare("DELETE FROM project_tags WHERE projectId = ?").bind(id));
    body.tags.forEach((tag) => {
      statements.push(db.prepare("INSERT INTO project_tags (projectId, tag) VALUES (?, ?)").bind(id, tag));
    });
  }
  if (hasPhases) {
    statements.push(db.prepare("DELETE FROM project_phases WHERE projectId = ?").bind(id));
    body.phases.forEach((ph, i) => {
      if (!ph.startYear || !ph.startWeek || !ph.endYear || !ph.endWeek) return;
      statements.push(
        db.prepare(
          "INSERT INTO project_phases (id, projectId, name, startYear, startWeek, endYear, endWeek, sortOrder, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)"
        ).bind(ph.id || genId("phase"), id, ph.name || "", ph.startYear, ph.startWeek, ph.endYear, ph.endWeek, ph.sortOrder ?? i, now, now)
      );
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
      db.prepare("DELETE FROM assignment_periods WHERE projectId = ?").bind(id),
      db.prepare("DELETE FROM project_phases WHERE projectId = ?").bind(id),
      db.prepare("UPDATE tenders SET linkedProjectId = NULL WHERE linkedProjectId = ?").bind(id),
      db.prepare("DELETE FROM projects WHERE id = ?").bind(id)
    ]);
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Löschen fehlgeschlagen: " + err.message, 500);
  }
}
