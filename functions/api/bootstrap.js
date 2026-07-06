/* =========================================================
   GET /api/bootstrap
   Liefert alle Projekte, Ausschreibungen, Mitarbeiter, Tags,
   Gewerke, Vergabeportale, Urlaub und Einstellungen in einem
   einzigen Aufruf (schneller initialer Ladevorgang). Projekte
   bekommen ihre Mitarbeiter/Tags/Bauabschnitte/Einsatzzeiträume,
   Ausschreibungen ihre Gewerke direkt als Feld angehängt
   (employeeIds / tags / gewerke / phases / assignmentPeriods).
   ========================================================= */

import { json, errorResponse, currentUserEmail, getAdminEmails, isAdminEmail } from "./_utils.js";

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden. Siehe Setup-Anleitung.", 500);

  try {
    const [
      projects, tenders, settingsRow, employees, portals,
      projectEmployees, projectTags, tenderGewerke, adminEmails,
      assignmentPeriods, projectPhases, vacations
    ] = await Promise.all([
      db.prepare("SELECT * FROM projects ORDER BY startYear, startWeek").all(),
      db.prepare("SELECT * FROM tenders ORDER BY submissionDatum").all(),
      db.prepare("SELECT data FROM settings WHERE id = 1").first(),
      db.prepare("SELECT * FROM employees ORDER BY nachname, vorname").all(),
      db.prepare("SELECT * FROM portals ORDER BY name").all(),
      db.prepare("SELECT * FROM project_employees").all(),
      db.prepare("SELECT * FROM project_tags").all(),
      db.prepare("SELECT * FROM tender_gewerke").all(),
      getAdminEmails(db),
      db.prepare("SELECT * FROM assignment_periods ORDER BY startYear, startWeek").all(),
      db.prepare("SELECT * FROM project_phases ORDER BY projectId, sortOrder, startYear, startWeek").all(),
      db.prepare("SELECT * FROM vacations ORDER BY startYear, startWeek").all()
    ]);

    let settings = null;
    if (settingsRow && settingsRow.data) {
      try { settings = JSON.parse(settingsRow.data); } catch (e) { settings = null; }
    }

    const empByProject = {};
    (projectEmployees.results || []).forEach((row) => {
      (empByProject[row.projectId] = empByProject[row.projectId] || []).push(row.employeeId);
    });
    const tagsByProject = {};
    (projectTags.results || []).forEach((row) => {
      (tagsByProject[row.projectId] = tagsByProject[row.projectId] || []).push(row.tag);
    });
    const gewerkeByTender = {};
    (tenderGewerke.results || []).forEach((row) => {
      (gewerkeByTender[row.tenderId] = gewerkeByTender[row.tenderId] || []).push(row.gewerk);
    });

    // assignmentPeriods je Projekt, darin gruppiert je Mitarbeiter:
    // { [projectId]: { [employeeId]: [{id,startYear,startWeek,endYear,endWeek}, ...] } }
    const periodsByProject = {};
    (assignmentPeriods.results || []).forEach((row) => {
      const byEmp = (periodsByProject[row.projectId] = periodsByProject[row.projectId] || {});
      (byEmp[row.employeeId] = byEmp[row.employeeId] || []).push({
        id: row.id,
        employeeId: row.employeeId,
        startYear: row.startYear,
        startWeek: row.startWeek,
        endYear: row.endYear,
        endWeek: row.endWeek
      });
    });

    const phasesByProject = {};
    (projectPhases.results || []).forEach((row) => {
      (phasesByProject[row.projectId] = phasesByProject[row.projectId] || []).push({
        id: row.id,
        name: row.name || "",
        startYear: row.startYear,
        startWeek: row.startWeek,
        endYear: row.endYear,
        endWeek: row.endWeek,
        sortOrder: row.sortOrder || 0
      });
    });

    const projectList = (projects.results || []).map((p) => Object.assign({}, p, {
      employeeIds: empByProject[p.id] || [],
      tags: tagsByProject[p.id] || [],
      assignmentPeriods: periodsByProject[p.id] || {},
      phases: phasesByProject[p.id] || []
    }));
    const tenderList = (tenders.results || []).map((t) => Object.assign({}, t, {
      gewerke: gewerkeByTender[t.id] || []
    }));

    const email = currentUserEmail(context.request);

    return json({
      projects: projectList,
      tenders: tenderList,
      employees: employees.results || [],
      portals: portals.results || [],
      vacations: vacations.results || [],
      settings,
      user: email,
      isAdmin: isAdminEmail(email, adminEmails)
    });
  } catch (err) {
    return errorResponse("Bootstrap fehlgeschlagen: " + err.message, 500);
  }
}
