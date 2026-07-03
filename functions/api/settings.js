/* =========================================================
   PUT /api/settings – Stammdaten/Einstellungen komplett
   ersetzen (Projektleiter, Obermonteure, Kapazitätsgrenzen,
   Farbpalette). Wird als ein JSON-Blob gespeichert, da die
   Struktur klein ist und sich nicht mit anderen Tabellen
   überschneidet.
   ========================================================= */

import { json, errorResponse } from "./_utils.js";

export async function onRequestPut(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  let body;
  try { body = await context.request.json(); } catch (e) { return errorResponse("Ungültiges JSON."); }
  if (!body || typeof body !== "object") return errorResponse("Ungültige Einstellungen.");

  try {
    await db.prepare(
      `INSERT INTO settings (id, data) VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data`
    ).bind(JSON.stringify(body)).run();
    return json({ ok: true });
  } catch (err) {
    return errorResponse("Speichern der Einstellungen fehlgeschlagen: " + err.message, 500);
  }
}
