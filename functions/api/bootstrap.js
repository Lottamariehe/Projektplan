/* =========================================================
   GET /api/bootstrap
   Liefert alle Projekte, Ausschreibungen und Einstellungen
   in einem einzigen Aufruf (schneller initialer Ladevorgang).
   ========================================================= */

import { json, errorResponse, currentUserEmail } from "./_utils.js";

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden. Siehe Setup-Anleitung.", 500);

  try {
    const [projects, tenders, settingsRow] = await Promise.all([
      db.prepare("SELECT * FROM projects ORDER BY startYear, startWeek").all(),
      db.prepare("SELECT * FROM tenders ORDER BY submissionDatum").all(),
      db.prepare("SELECT data FROM settings WHERE id = 1").first()
    ]);

    let settings = null;
    if (settingsRow && settingsRow.data) {
      try { settings = JSON.parse(settingsRow.data); } catch (e) { settings = null; }
    }

    return json({
      projects: projects.results || [],
      tenders: tenders.results || [],
      settings,
      user: currentUserEmail(context.request)
    });
  } catch (err) {
    return errorResponse("Bootstrap fehlgeschlagen: " + err.message, 500);
  }
}
