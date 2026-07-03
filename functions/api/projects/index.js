/* =========================================================
   POST /api/projects – neues Projekt anlegen
   Die ID wird im Frontend erzeugt (Util.uid) und mitgeschickt,
   damit die Gantt-Ansicht sofort ohne Rückfrage rendern kann.
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
    ).run();

    return json({ ok: true, id: body.id }, { status: 201 });
  } catch (err) {
    return errorResponse("Anlegen fehlgeschlagen: " + err.message, 500);
  }
}
