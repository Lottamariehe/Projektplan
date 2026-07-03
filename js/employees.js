/* =========================================================
   employees.js – Mitarbeiterverwaltung (Stammdaten).
   Inline-Bearbeitung direkt in der Tabelle, wie im restlichen
   Programm üblich (keine separaten Eingabemasken).
   ========================================================= */

(function (global) {
  "use strict";

  function render() {
    const body = document.getElementById("employeesBody");
    if (!body) return;

    const dl = document.getElementById("dlFunktion");
    if (dl) dl.innerHTML = Storage.EMPLOYEE_FUNKTIONEN.map((f) => `<option value="${Util.escapeHtml(f)}">`).join("");

    const list = App.state.employees.slice().sort((a, b) => (a.nachname || "").localeCompare(b.nachname || ""));

    if (!list.length) {
      body.innerHTML = `<tr><td colspan="6" style="color:var(--color-text-faint); text-align:center; padding:30px;">Noch keine Mitarbeiter angelegt.</td></tr>`;
      return;
    }

    body.innerHTML = list.map(rowHtml).join("");

    list.forEach((e) => {
      const row = body.querySelector(`tr[data-id="${e.id}"]`);
      if (!row) return;

      row.querySelector(".e-vorname").addEventListener("change", (ev) => App.updateEmployee(e.id, { vorname: ev.target.value.trim() }));
      row.querySelector(".e-nachname").addEventListener("change", (ev) => App.updateEmployee(e.id, { nachname: ev.target.value.trim() }));
      row.querySelector(".e-funktion").addEventListener("change", (ev) => App.updateEmployee(e.id, { funktion: ev.target.value.trim() }));
      row.querySelector(".e-bemerkungen").addEventListener("change", (ev) => App.updateEmployee(e.id, { bemerkungen: ev.target.value.trim() }));
      row.querySelector(".e-aktiv").addEventListener("change", (ev) => {
        App.updateEmployee(e.id, { aktiv: ev.target.checked });
        Toast.show(ev.target.checked ? "Mitarbeiter aktiviert." : "Mitarbeiter deaktiviert.");
      });

      const delBtn = row.querySelector(".e-delete");
      if (delBtn) {
        delBtn.addEventListener("click", () => {
          if (confirm(`Mitarbeiter „${(e.vorname + " " + e.nachname).trim()}“ endgültig löschen?`)) {
            App.deleteEmployee(e.id);
            Toast.show("Mitarbeiter gelöscht.");
          }
        });
      }
    });
  }

  function rowHtml(e) {
    const fullName = (e.vorname + " " + e.nachname).trim();
    const isActive = e.aktiv === undefined || e.aktiv === true || e.aktiv === 1;
    const deleteBtn = App.isAdmin
      ? `<button class="e-delete" title="Endgültig löschen">Löschen</button>`
      : `<span class="settings-hint" style="margin:0;">nur Admin</span>`;
    return `<tr data-id="${e.id}" class="${isActive ? "" : "row-inactive"}">
      <td><input type="text" class="inline-input e-vorname" value="${Util.escapeHtml(e.vorname)}" placeholder="Vorname"></td>
      <td><input type="text" class="inline-input e-nachname" value="${Util.escapeHtml(e.nachname)}" placeholder="Nachname"></td>
      <td><input type="text" class="inline-input e-funktion" list="dlFunktion" value="${Util.escapeHtml(e.funktion)}" placeholder="Funktion/Rolle"></td>
      <td style="text-align:center;"><input type="checkbox" class="e-aktiv" ${isActive ? "checked" : ""} title="Aktiv"></td>
      <td><input type="text" class="inline-input e-bemerkungen" value="${Util.escapeHtml(e.bemerkungen)}" placeholder="Bemerkungen"></td>
      <td>${deleteBtn}</td>
    </tr>`;
  }

  function bindToolbar() {
    const btn = document.getElementById("btnNewEmployee");
    if (!btn) return;
    btn.addEventListener("click", () => {
      App.addEmployee({ vorname: "", nachname: "Neuer Mitarbeiter", funktion: "", aktiv: true, bemerkungen: "" });
      Toast.show("Mitarbeiter angelegt – bitte Namen ergänzen.");
    });
  }

  global.Employees = { render, bindToolbar };
})(window);
