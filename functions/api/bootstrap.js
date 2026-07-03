/* =========================================================
   GET /api/bootstrap
   Liefert alle Projekte, Ausschreibungen, Mitarbeiter, Tags,
   Gewerke, Vergabeportale und Einstellungen in einem einzigen
   Aufruf (schneller initialer Ladevorgang). Projekte/Ausschrei-
   bungen bekommen ihre Mitarbeiter/Tags/Gewerke direkt als
   Array-Feld angehängt (employeeIds / tags / gewerke).
   ========================================================= */

import { json, errorResponse, currentUserEmail, getAdminEmails, isAdminEmail } from "./_utils.js";

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden. Siehe Setup-Anleitung.", 500);

  try {
    const [
      projects, tenders, settingsRow, employees, portals,
      projectEmployees, projectTags, tenderGewerke, adminEmails
    ] = await Promise.all([
      db.prepare("SELECT * FROM projects ORDER BY startYear, startWeek").all(),
      db.prepare("SELECT * FROM tenders ORDER BY submissionDatum").all(),
      db.prepare("SELECT data FROM settings WHERE id = 1").first(),
      db.prepare("SELECT * FROM employees ORDER BY nachname, vorname").all(),
      db.prepare("SELECT * FROM portals ORDER BY name").all(),
      db.prepare("SELECT * FROM project_employees").all(),
      db.prepare("SELECT * FROM project_tags").all(),
      db.prepare("SELECT * FROM tender_gewerke").all(),
      getAdminEmails(db)
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

    const projectList = (projects.results || []).map((p) => Object.assign({}, p, {
      employeeIds: empByProject[p.id] || [],
      tags: tagsByProject[p.id] || []
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
      settings,
      user: email,
      isAdmin: isAdminEmail(email, adminEmails)
    });
  } catch (err) {
    return errorResponse("Bootstrap fehlgeschlagen: " + err.message, 500);
  }
}
