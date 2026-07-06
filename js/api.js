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

  /* ---------------- Mitarbeiter ---------------- */
  function getEmployees() {
    return request("/employees", { method: "GET" });
  }
  function createEmployee(employee) {
    return request("/employees", { method: "POST", body: JSON.stringify(employee) });
  }
  function updateEmployee(id, data) {
    return request("/employees/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(data) });
  }
  function deleteEmployee(id) {
    return request("/employees/" + encodeURIComponent(id), { method: "DELETE" });
  }
  function reorderEmployees(order) {
    return request("/employees/reorder", { method: "PUT", body: JSON.stringify({ order }) });
  }

  /* ---------------- Vergabeportale ---------------- */
  function getPortals() {
    return request("/portals", { method: "GET" });
  }
  function createPortal(portal) {
    return request("/portals", { method: "POST", body: JSON.stringify(portal) });
  }
  function updatePortal(id, data) {
    return request("/portals/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(data) });
  }
  function deletePortal(id) {
    return request("/portals/" + encodeURIComponent(id), { method: "DELETE" });
  }

  /* ---------------- Admin ---------------- */
  function getAdminConfig() {
    return request("/admin/config", { method: "GET" });
  }
  function updateAdminConfig(adminEmails) {
    return request("/admin/config", { method: "PUT", body: JSON.stringify({ adminEmails }) });
  }
  function adminReset(mode) {
    return request("/admin/reset", { method: "POST", body: JSON.stringify({ mode }) });
  }

  /* ---------------- Import ---------------- */
  function runImport(payload) {
    return request("/import", { method: "POST", body: JSON.stringify(payload) });
  }

  /* ---------------- Urlaub ---------------- */
  function getVacations() {
    return request("/vacations", { method: "GET" });
  }
  function createVacation(vacation) {
    return request("/vacations", { method: "POST", body: JSON.stringify(vacation) });
  }
  function updateVacation(id, data) {
    return request("/vacations/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(data) });
  }
  function deleteVacation(id) {
    return request("/vacations/" + encodeURIComponent(id), { method: "DELETE" });
  }

  global.Api = {
    bootstrap,
    createProject, updateProject, deleteProject,
    createTender, updateTender, deleteTender,
    updateSettings,
    currentIdentity,
    getEmployees, createEmployee, updateEmployee, deleteEmployee, reorderEmployees,
    getPortals, createPortal, updatePortal, deletePortal,
    getAdminConfig, updateAdminConfig, adminReset,
    runImport,
    getVacations, createVacation, updateVacation, deleteVacation
  };
})(window);
