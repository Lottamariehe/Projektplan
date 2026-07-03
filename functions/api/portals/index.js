/* =========================================================
   GET  /api/portals – alle Vergabeportale (Stammdaten)
   POST /api/portals – neues Vergabeportal anlegen
   Bewusst OHNE Zugangsdaten/Passwort-Feld – siehe
   ERWEITERUNGEN-ANLEITUNG.md für die Begründung.
   ========================================================= */

import { json, errorResponse } from "../_utils.js";

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  try {
    const rows = await db.prepare("SELECT * FROM portals ORDER BY name").all();
    return json({ portals: rows.results || [] });
  } catch (err) {
    return errorResponse("Laden der Vergabeportale fehlgeschlagen: " + err.message, 500);
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }
  if (!body || !body.id || !body.name) {
    return errorResponse("Felder 'id' und 'name' sind erforderlich.");
  }

  const now = new Date().toISOString();

  try {
    await db.prepare(
      `INSERT INTO portals (id, name, url, hinweis, createdAt, updatedAt) VALUES (?,?,?,?,?,?)`
    ).bind(
      body.id,
      body.name,
      body.url || "",
      body.hinweis || "",
      body.createdAt || now,
      body.updatedAt || now
    ).run();

    return json({ ok: true, id: body.id }, { status: 201 });
  } catch (err) {
    return errorResponse("Anlegen fehlgeschlagen: " + err.message, 500);
  }
}
