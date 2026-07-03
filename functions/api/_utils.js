/* =========================================================
   _utils.js – gemeinsame Hilfsfunktionen für die
   Cloudflare-Pages-Functions unter /api/*.
   ========================================================= */

export function json(data, init) {
  const headers = Object.assign(
    { "Content-Type": "application/json; charset=utf-8" },
    (init && init.headers) || {}
  );
  return new Response(JSON.stringify(data), Object.assign({}, init, { headers }));
}

export function errorResponse(message, status) {
  return json({ error: message }, { status: status || 400 });
}

/** Liest die von Cloudflare Access gesetzte Nutzer-E-Mail aus dem Request. */
export function currentUserEmail(request) {
  return request.headers.get("Cf-Access-Authenticated-User-Email") || null;
}

/** Baut aus einem Objekt + erlaubten Feldern ein UPDATE-Statement (nur übergebene Felder). */
export function buildUpdate(table, id, body, allowedFields) {
  const sets = [];
  const values = [];
  allowedFields.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      sets.push(f + " = ?");
      values.push(body[f]);
    }
  });
  if (!sets.length) return null;
  values.push(id);
  return {
    sql: `UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`,
    values
  };
}

/* =========================================================
   Admin-Rechte
   Admins werden anhand ihrer angemeldeten E-Mail-Adresse
   (von Cloudflare Access) erkannt. Die Liste der Admin-
   E-Mail-Adressen liegt in der eigenen Tabelle "admin_config"
   (nicht in "settings"), damit normale Nutzer sie nicht über
   die allgemeine Einstellungen-Speicherung verändern können.
   ========================================================= */

/** Liest die aktuelle Liste der Admin-E-Mail-Adressen aus der Datenbank. */
export async function getAdminEmails(db) {
  try {
    const row = await db.prepare("SELECT adminEmails FROM admin_config WHERE id = 1").first();
    if (!row || !row.adminEmails) return [];
    const list = JSON.parse(row.adminEmails);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export function isAdminEmail(email, adminEmails) {
  if (!email) return false;
  const needle = String(email).trim().toLowerCase();
  return (adminEmails || []).some((e) => String(e).trim().toLowerCase() === needle);
}

/**
 * Prüft, ob der aktuelle Request von einem Administrator stammt.
 * Gibt bei Erfolg null zurück, sonst eine fertige 403-Response
 * ("return forbidden" Muster in den Handlern).
 */
export async function requireAdmin(context) {
  const db = context.env.DB;
  const email = currentUserEmail(context.request);
  const admins = await getAdminEmails(db);
  if (!isAdminEmail(email, admins)) {
    return errorResponse(
      "Diese Aktion ist nur für Administratoren erlaubt. Angemeldet als: " + (email || "unbekannt"),
      403
    );
  }
  return null;
}
