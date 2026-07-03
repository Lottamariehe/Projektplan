/* =========================================================
   PUT    /api/tenders/:id – Ausschreibung aktualisieren
          (inkl. Gewerke, falls mitgeschickt)
   DELETE /api/tenders/:id – Ausschreibung ENDGÜLTIG löschen
          (nur Administratoren – kritische Aktion)
   ========================================================= */

import { json, errorResponse, buildUpdate, requireAdmin } from "../_utils.js";

const UPDATABLE_FIELDS = [
  "name", "auftraggeber", "ansprechpartner", "adresse",
  "submissionDatum", "submissionUhrzeit",
  "startYear", "startWeek", "endYear", "endWeek",
  "angebotsstatus", "auftragswert", "zustaendigIntern",
  "bearbeitungsfrist", "bemerkungen", "unterlagenLink",
  "linkedProjectId", "portalId", "updatedAt"
];

export async function onRequestPut(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const id = context.params.id;
  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }

  if (!body.updatedAt) body.updatedAt = new Date().toISOString();
  const update = buildUpdate("tenders", id, body, UPDATABLE_FIELDS);

  const statements = [];
  if (update) statements.push(db.prepare(update.sql).bind(...update.values));

  if (Array.isArray(body.gewerke)) {
    statements.push(db.prepare("DELETE FROM tender_gewerke WHERE tenderId = ?").bind(id));
    body.gewerke.forEach((g) => {
      statements.push(db.prepare("INSERT INTO tender_gewerke (tenderId, gewerk) VALUES (?, ?)").bind(id, g));
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
      db.prepare("DELETE FROM tender_gewerke WHERE tenderId = ?").bind(id),
      db.prepare("DELETE FROM tenders WHERE id = ?").bind(id)
    ]);
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Löschen fehlgeschlagen: " + err.message, 500);
  }
}
