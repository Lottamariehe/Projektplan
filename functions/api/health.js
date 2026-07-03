/* =========================================================
   GET /api/health
   Einfacher Prüf-Endpunkt: bestätigt, dass die Functions
   laufen und die D1-Datenbank erreichbar ist.
   ========================================================= */

import { json, errorResponse } from "./_utils.js";

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);
  try {
    const check = await db.prepare("SELECT COUNT(*) AS anzahl FROM projects").first();
    return json({ ok: true, projekte: check ? check.anzahl : 0, zeit: new Date().toISOString() });
  } catch (err) {
    return errorResponse("Datenbank nicht erreichbar: " + err.message, 500);
  }
}
