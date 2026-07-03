/* =========================================================
   api.js – Schnittstelle zum Cloudflare-Backend (/api/*).
   Wird nur genutzt, wenn ein Backend erreichbar ist; ohne
   Backend (z. B. lokale Nutzung per Doppelklick) arbeitet
   die App weiterhin mit Local Storage (siehe state.js).
   ========================================================= */

(function (global) {
  "use strict";

  const BASE = "/api";

  async function request(path, options) {
    const res = await fetch(BASE + path, Object.assign({
      headers: { "Content-Type": "application/json" }
    }, options));
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).error || ""; } catch (e) { /* ignore */ }
      throw new Error("API-Fehler " + res.status + (detail ? ": " + detail : ""));
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function bootstrap() {
    return request("/bootstrap", { method: "GET" });
  }

  function createProject(project) {
    return request("/projects", { method: "POST", body: JSON.stringify(project) });
  }
  function updateProject(id, data) {
    return request("/projects/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(data) });
  }
  function deleteProject(id) {
    return request("/projects/" + encodeURIComponent(id), { method: "DELETE" });
  }

  function createTender(tender) {
    return request("/tenders", { method: "POST", body: JSON.stringify(tender) });
  }
  function updateTender(id, data) {
    return request("/tenders/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(data) });
  }
  function deleteTender(id) {
    return request("/tenders/" + encodeURIComponent(id), { method: "DELETE" });
  }

  function updateSettings(settings) {
    return request("/settings", { method: "PUT", body: JSON.stringify(settings) });
  }

  /** Liest die von Cloudflare Access übermittelte Identität aus (falls vorhanden). */
  async function currentIdentity() {
    try {
      const res = await fetch("/cdn-cgi/access/get-identity", { credentials: "include" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  global.Api = {
    bootstrap,
    createProject, updateProject, deleteProject,
    createTender, updateTender, deleteTender,
    updateSettings,
    currentIdentity
  };
})(window);
