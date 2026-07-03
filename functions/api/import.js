/* =========================================================
   POST /api/import – Bulk-Import von Projekten, Ausschreibungen,
   Mitarbeitern und Vergabeportalen aus dem Import-Assistenten
   (js/importwizard.js). Die eigentliche Spaltenzuordnung, das
   Erkennen doppelter Datensätze (per ID oder Name) und die
   Fehlerprüfung passieren im Browser – dieser Endpunkt speichert
   nur noch die bereits aufbereiteten Datensätze.

   body.mode: "add" | "update" | "replace"
     add     – nur Datensätze mit noch unbekannter ID anlegen
     update  – bestehende Datensätze (per ID) aktualisieren,
               unbekannte IDs werden neu angelegt
     replace – kompletten Datenbestand ersetzen (NUR Administrator)

   body.projects / body.tenders / body.employees / body.portals:
     Arrays mit bereits aufbereiteten Datensätzen (inkl. id).
   ========================================================= */

import { json, errorResponse, requireAdmin } from "./_utils.js";

const PROJECT_FIELDS = [
  "id", "name", "auftraggeber", "adresse", "startYear", "startWeek", "endYear", "endWeek",
  "projektleiter", "obermonteur", "besetzung", "status", "farbe", "bemerkungen", "notizen"
];
const TENDER_FIELDS = [
  "id", "name", "auftraggeber", "ansprechpartner", "adresse", "submissionDatum", "submissionUhrzeit",
  "startYear", "startWeek", "endYear", "endWeek", "angebotsstatus", "auftragswert", "zustaendigIntern",
  "bearbeitungsfrist", "bemerkungen", "unterlagenLink", "linkedProjectId", "portalId"
];
const EMPLOYEE_FIELDS = [
  "id", "vorname", "nachname", "funktion", "team", "qualifikation",
  "wochenarbeitszeit", "beschaeftigungsstatus", "sortOrder", "aktiv", "bemerkungen"
];
const PORTAL_FIELDS = ["id", "name", "url", "hinweis"];

async function existingIds(db, table) {
  const rows = await db.prepare(`SELECT id FROM ${table}`).all();
  return new Set((rows.results || []).map((r) => r.id));
}

function buildInsertOrReplace(table, fields, row, now) {
  const cols = fields.concat(["createdAt", "updatedAt"]);
  const placeholders = cols.map(() => "?").join(",");
  const updates = fields.filter((f) => f !== "id").map((f) => `${f} = excluded.${f}`).join(", ");
  const sql = `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updates}, updatedAt = excluded.updatedAt`;
  const values = fields.map((f) => (row[f] === undefined ? null : row[f])).concat([row.createdAt || now, now]);
  return { sql, values };
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }

  const mode = body && body.mode;
  if (!["add", "update", "replace"].includes(mode)) {
    return errorResponse("Feld 'mode' muss 'add', 'update' oder 'replace' sein.");
  }
  if (mode === "replace") {
    const forbidden = await requireAdmin(context);
    if (forbidden) return forbidden;
  }

  const now = new Date().toISOString();
  const projects = Array.isArray(body.projects) ? body.projects : [];
  const tenders = Array.isArray(body.tenders) ? body.tenders : [];
  const employees = Array.isArray(body.employees) ? body.employees : [];
  const portals = Array.isArray(body.portals) ? body.portals : [];

  const summary = {
    projects: { created: 0, updated: 0, skipped: 0 },
    tenders: { created: 0, updated: 0, skipped: 0 },
    employees: { created: 0, updated: 0, skipped: 0 },
    portals: { created: 0, updated: 0, skipped: 0 }
  };

  try {
    const statements = [];

    if (mode === "replace") {
      statements.push(
        db.prepare("DELETE FROM project_employees"),
        db.prepare("DELETE FROM project_tags"),
        db.prepare("DELETE FROM tender_gewerke"),
        db.prepare("DELETE FROM projects"),
        db.prepare("DELETE FROM tenders"),
        db.prepare("DELETE FROM employees"),
        db.prepare("DELETE FROM portals")
      );
    }

    const existingProjectIds = mode === "add" ? await existingIds(db, "projects") : new Set();
    const existingTenderIds = mode === "add" ? await existingIds(db, "tenders") : new Set();
    const existingEmployeeIds = mode === "add" ? await existingIds(db, "employees") : new Set();
    const existingPortalIds = mode === "add" ? await existingIds(db, "portals") : new Set();

    portals.forEach((p) => {
      if (!p || !p.id || !p.name) { summary.portals.skipped++; return; }
      if (mode === "add" && existingPortalIds.has(p.id)) { summary.portals.skipped++; return; }
      const { sql, values } = buildInsertOrReplace("portals", PORTAL_FIELDS, p, now);
      statements.push(db.prepare(sql).bind(...values));
      summary.portals[mode === "add" || !existingPortalIds.has(p.id) ? "created" : "updated"]++;
    });

    employees.forEach((e) => {
      if (!e || !e.id) { summary.employees.skipped++; return; }
      if (mode === "add" && existingEmployeeIds.has(e.id)) { summary.employees.skipped++; return; }
      const row = Object.assign({ sortOrder: 0 }, e, { aktiv: e.aktiv === false || e.aktiv === 0 ? 0 : 1 });
      const { sql, values } = buildInsertOrReplace("employees", EMPLOYEE_FIELDS, row, now);
      statements.push(db.prepare(sql).bind(...values));
      summary.employees[existingEmployeeIds.has(e.id) ? "updated" : "created"]++;
    });

    projects.forEach((p) => {
      if (!p || !p.id || !p.name || !p.startYear || !p.startWeek || !p.endYear || !p.endWeek) {
        summary.projects.skipped++; return;
      }
      if (mode === "add" && existingProjectIds.has(p.id)) { summary.projects.skipped++; return; }
      const row = Object.assign({ status: "Geplant", farbe: "#2f6fed", besetzung: 0 }, p);
      const { sql, values } = buildInsertOrReplace("projects", PROJECT_FIELDS, row, now);
      statements.push(db.prepare(sql).bind(...values));
      summary.projects[existingProjectIds.has(p.id) ? "updated" : "created"]++;

      if (Array.isArray(p.employeeIds)) {
        statements.push(db.prepare("DELETE FROM project_employees WHERE projectId = ?").bind(p.id));
        const ranges = p.employeeRanges && typeof p.employeeRanges === "object" ? p.employeeRanges : {};
        p.employeeIds.forEach((empId) => {
          const r = ranges[empId] || {};
          statements.push(
            db.prepare(
              "INSERT INTO project_employees (projectId, employeeId, startYear, startWeek, endYear, endWeek) VALUES (?,?,?,?,?,?)"
            ).bind(p.id, empId, r.startYear || null, r.startWeek || null, r.endYear || null, r.endWeek || null)
          );
        });
      }
      if (Array.isArray(p.tags)) {
        statements.push(db.prepare("DELETE FROM project_tags WHERE projectId = ?").bind(p.id));
        p.tags.forEach((tag) => {
          statements.push(db.prepare("INSERT INTO project_tags (projectId, tag) VALUES (?, ?)").bind(p.id, tag));
        });
      }
    });

    tenders.forEach((t) => {
      if (!t || !t.id || !t.name || !t.startYear || !t.startWeek || !t.endYear || !t.endWeek) {
        summary.tenders.skipped++; return;
      }
      if (mode === "add" && existingTenderIds.has(t.id)) { summary.tenders.skipped++; return; }
      const row = Object.assign({ angebotsstatus: "In Bearbeitung" }, t);
      const { sql, values } = buildInsertOrReplace("tenders", TENDER_FIELDS, row, now);
      statements.push(db.prepare(sql).bind(...values));
      summary.tenders[existingTenderIds.has(t.id) ? "updated" : "created"]++;

      if (Array.isArray(t.gewerke)) {
        statements.push(db.prepare("DELETE FROM tender_gewerke WHERE tenderId = ?").bind(t.id));
        t.gewerke.forEach((g) => {
          statements.push(db.prepare("INSERT INTO tender_gewerke (tenderId, gewerk) VALUES (?, ?)").bind(t.id, g));
        });
      }
    });

    if (statements.length) await db.batch(statements);

    return json({ ok: true, mode, summary });
  } catch (err) {
    return errorResponse("Import fehlgeschlagen: " + err.message, 500);
  }
}
