/* =========================================================
   GET  /api/vacations – alle Urlaubszeiträume (alle Mitarbeiter)
   POST /api/vacations – neuen Urlaubszeitraum anlegen
   ========================================================= */

import { json, errorResponse } from "../_utils.js";

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  try {
    const rows = await db.prepare("SELECT * FROM vacations ORDER BY startYear, startWeek").all();
    return json({ vacations: rows.results || [] });
  } catch (err) {
    return errorResponse("Laden des Urlaubs fehlgeschlagen: " + err.message, 500);
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }

  if (!body || !body.id || !body.employeeId) {
    return errorResponse("Felder 'id' und 'employeeId' sind erforderlich.");
  }
  if (!body.startYear || !body.startWeek || !body.endYear || !body.endWeek) {
    return errorResponse("Start- und End-Kalenderwoche sind erforderlich.");
  }

  const now = new Date().toISOString();

  try {
    await db.prepare(
      `INSERT INTO vacations (id, employeeId, startYear, startWeek, endYear, endWeek, bemerkung, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(
      body.id,
      body.employeeId,
      body.startYear,
      body.startWeek,
      body.endYear,
      body.endWeek,
      body.bemerkung || "",
      body.createdAt || now,
      body.updatedAt || now
    ).run();

    return json({ ok: true, id: body.id }, { status: 201 });
  } catch (err) {
    return errorResponse("Anlegen fehlgeschlagen: " + err.message, 500);
  }
}
