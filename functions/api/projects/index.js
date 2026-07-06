/* =========================================================
   POST /api/projects – neues Projekt anlegen
   Die ID wird im Frontend erzeugt (Util.uid) und mitgeschickt,
   damit die Gantt-Ansicht sofort ohne Rückfrage rendern kann.

   body.employeeIds:        string[] – zugeordnete Mitarbeiter (optional)
   body.tags:               string[] – Projekt-Tags (optional)
   body.assignmentPeriods:  { [employeeId]: [{id,startYear,startWeek,endYear,endWeek}, ...] }
                             – beliebig viele individuelle Einsatzzeiträume je
                             Mitarbeiter innerhalb der Projektlaufzeit. Fehlt ein
                             Mitarbeiter hier (oder ist die Liste leer), gilt er
                             automatisch für die gesamte Projektlaufzeit.
   body.phases:             [{id,name,startYear,startWeek,endYear,endWeek,sortOrder}]
                             – beliebig viele Bauabschnitte (optional). Ohne
                             Bauabschnitte wird das Projekt als ein Balken über
                             die gesamte Laufzeit dargestellt.
   ========================================================= */

import { json, errorResponse } from "../_utils.js";

function genId(prefix) {
  return prefix + "_" + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 16) : String(Math.random()).slice(2));
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }

  if (!body || !body.id || !body.name) {
    return errorResponse("Felder 'id' und 'name' sind erforderlich.");
  }
  if (!body.startYear || !body.startWeek || !body.endYear || !body.endWeek) {
    return errorResponse("Start- und End-Kalenderwoche sind erforderlich.");
  }

  const now = new Date().toISOString();
  const employeeIds = Array.isArray(body.employeeIds) ? body.employeeIds : [];
  const tags = Array.isArray(body.tags) ? body.tags : [];
  const assignmentPeriods = body.assignmentPeriods && typeof body.assignmentPeriods === "object" ? body.assignmentPeriods : {};
  const phases = Array.isArray(body.phases) ? body.phases : [];

  try {
    const statements = [
      db.prepare(
        `INSERT INTO projects
          (id, name, auftraggeber, adresse, startYear, startWeek, endYear, endWeek,
           projektleiter, obermonteur, besetzung, status, farbe, bemerkungen, notizen, createdAt, updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        body.id,
        body.name,
        body.auftraggeber || "",
        body.adresse || "",
        body.startYear,
        body.startWeek,
        body.endYear,
        body.endWeek,
        body.projektleiter || "",
        body.obermonteur || "",
        body.besetzung || 0,
        body.status || "Geplant",
        body.farbe || "#2f6fed",
        body.bemerkungen || "",
        body.notizen || "",
        body.createdAt || now,
        body.updatedAt || now
      )
    ];

    employeeIds.forEach((empId) => {
      statements.push(
        db.prepare("INSERT INTO project_employees (projectId, employeeId) VALUES (?, ?)").bind(body.id, empId)
      );
      const periods = Array.isArray(assignmentPeriods[empId]) ? assignmentPeriods[empId] : [];
      periods.forEach((p) => {
        if (!p.startYear || !p.startWeek || !p.endYear || !p.endWeek) return;
        statements.push(
          db.prepare(
            "INSERT INTO assignment_periods (id, projectId, employeeId, startYear, startWeek, endYear, endWeek, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)"
          ).bind(p.id || genId("asg"), body.id, empId, p.startYear, p.startWeek, p.endYear, p.endWeek, now, now)
        );
      });
    });
    tags.forEach((tag) => {
      statements.push(
        db.prepare("INSERT INTO project_tags (projectId, tag) VALUES (?, ?)").bind(body.id, tag)
      );
    });
    phases.forEach((ph, i) => {
      if (!ph.startYear || !ph.startWeek || !ph.endYear || !ph.endWeek) return;
      statements.push(
        db.prepare(
          "INSERT INTO project_phases (id, projectId, name, startYear, startWeek, endYear, endWeek, sortOrder, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)"
        ).bind(ph.id || genId("phase"), body.id, ph.name || "", ph.startYear, ph.startWeek, ph.endYear, ph.endWeek, ph.sortOrder ?? i, now, now)
      );
    });

    await db.batch(statements);

    return json({ ok: true, id: body.id }, { status: 201 });
  } catch (err) {
    return errorResponse("Anlegen fehlgeschlagen: " + err.message, 500);
  }
}
