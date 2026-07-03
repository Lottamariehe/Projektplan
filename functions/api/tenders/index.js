/* =========================================================
   POST /api/tenders – neue Ausschreibung anlegen
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

  try {
    await db.prepare(
      `INSERT INTO tenders
        (id, name, auftraggeber, ansprechpartner, adresse, submissionDatum, submissionUhrzeit,
         startYear, startWeek, endYear, endWeek, angebotsstatus, auftragswert, zustaendigIntern,
         bearbeitungsfrist, bemerkungen, unterlagenLink, linkedProjectId, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
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
      body.createdAt || now,
      body.updatedAt || now
    ).run();

    return json({ ok: true, id: body.id }, { status: 201 });
  } catch (err) {
    return errorResponse("Anlegen fehlgeschlagen: " + err.message, 500);
  }
}
