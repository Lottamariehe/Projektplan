/* =========================================================
   POST /api/tenders – neue Ausschreibung anlegen
   body.gewerke: string[]  – Gewerke der Ausschreibung (optional)
   ========================================================= */

import { json, errorResponse } from "../_utils.js";

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
  const gewerke = Array.isArray(body.gewerke) ? body.gewerke : [];

  try {
    const statements = [
      db.prepare(
        `INSERT INTO tenders
          (id, name, auftraggeber, ansprechpartner, adresse, submissionDatum, submissionUhrzeit,
           startYear, startWeek, endYear, endWeek, angebotsstatus, auftragswert, zustaendigIntern,
           bearbeitungsfrist, bemerkungen, unterlagenLink, linkedProjectId, portalId, createdAt, updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        body.id,
        body.name,
        body.auftraggeber || "",
        body.ansprechpartner || "",
        body.adresse || "",
        body.submissionDatum || null,
        body.submissionUhrzeit || null,
        body.startYear,
        body.startWeek,
        body.endYear,
        body.endWeek,
        body.angebotsstatus || "In Bearbeitung",
        body.auftragswert || null,
        body.zustaendigIntern || "",
        body.bearbeitungsfrist || null,
        body.bemerkungen || "",
        body.unterlagenLink || "",
        body.linkedProjectId || null,
        body.portalId || null,
        body.createdAt || now,
        body.updatedAt || now
      )
    ];

    gewerke.forEach((g) => {
      statements.push(db.prepare("INSERT INTO tender_gewerke (tenderId, gewerk) VALUES (?, ?)").bind(body.id, g));
    });

    await db.batch(statements);

    return json({ ok: true, id: body.id }, { status: 201 });
  } catch (err) {
    return errorResponse("Anlegen fehlgeschlagen: " + err.message, 500);
  }
}
