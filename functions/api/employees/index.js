/* =========================================================
   GET  /api/employees – alle Mitarbeiter (Stammdaten)
   POST /api/employees – neuen Mitarbeiter anlegen
   ========================================================= */

import { json, errorResponse } from "../_utils.js";

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  try {
    const rows = await db.prepare("SELECT * FROM employees ORDER BY nachname, vorname").all();
    return json({ employees: rows.results || [] });
  } catch (err) {
    return errorResponse("Laden der Mitarbeiter fehlgeschlagen: " + err.message, 500);
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }
  if (!body || !body.id || (!body.vorname && !body.nachname)) {
    return errorResponse("Felder 'id' sowie Vor- oder Nachname sind erforderlich.");
  }

  const now = new Date().toISOString();

  try {
    await db.prepare(
      `INSERT INTO employees (id, vorname, nachname, funktion, aktiv, bemerkungen, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?)`
    ).bind(
      body.id,
      body.vorname || "",
      body.nachname || "",
      body.funktion || "",
      body.aktiv === false ? 0 : 1,
      body.bemerkungen || "",
      body.createdAt || now,
      body.updatedAt || now
    ).run();

    return json({ ok: true, id: body.id }, { status: 201 });
  } catch (err) {
    return errorResponse("Anlegen fehlgeschlagen: " + err.message, 500);
  }
}
