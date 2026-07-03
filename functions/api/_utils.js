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
