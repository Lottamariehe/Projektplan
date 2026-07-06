/* =========================================================
   POST /api/admin/reset – kritische, vollständige Lösch-
   /Reset-Aktionen. Nur für Administratoren.

   body.mode:
     "clearData" -> löscht alle Projekte und Ausschreibungen
                    (inkl. Zuordnungen/Tags/Gewerke), behält
                    Mitarbeiter, Vergabeportale, Einstellungen
                    und Admin-Konfiguration.
     "fullReset"  -> zusätzlich Mitarbeiter, Vergabeportale und
                    Einstellungen (auf Standard) zurücksetzen.
                    Die Admin-Konfiguration bleibt IMMER erhalten,
                    damit sich niemand versehentlich aussperrt.
   ========================================================= */

import { json, errorResponse, requireAdmin } from "../_utils.js";

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return errorResponse("D1-Datenbank 'DB' ist nicht gebunden.", 500);

  const forbidden = await requireAdmin(context);
  if (forbidden) return forbidden;

  let body;
  try { body = await context.request.json(); } catch (e) { body = {}; }
  const mode = body && body.mode;

  if (mode !== "clearData" && mode !== "fullReset") {
    return errorResponse("Unbekannter Modus. Erwartet: 'clearData' oder 'fullReset'.");
  }

  try {
    const statements = [
      db.prepare("DELETE FROM project_employees"),
      db.prepare("DELETE FROM assignment_periods"),
      db.prepare("DELETE FROM project_phases"),
      db.prepare("DELETE FROM project_tags"),
      db.prepare("DELETE FROM tender_gewerke"),
      db.prepare("DELETE FROM projects"),
      db.prepare("DELETE FROM tenders")
    ];

    if (mode === "fullReset") {
      statements.push(db.prepare("DELETE FROM employees"));
      statements.push(db.prepare("DELETE FROM vacations"));
      statements.push(db.prepare("DELETE FROM portals"));
      statements.push(db.prepare("DELETE FROM settings"));
    }

    await db.batch(statements);

    return json({
      ok: true,
      message: mode === "fullReset"
        ? "Datenbank vollständig zurückgesetzt (außer Admin-Konfiguration)."
        : "Alle Projekte und Ausschreibungen wurden gelöscht."
    });
  } catch (err) {
    return errorResponse("Zurücksetzen fehlgeschlagen: " + err.message, 500);
  }
}
