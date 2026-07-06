/* =========================================================
   urlaub.js – Urlaubsplanung: alle Mitarbeiter mit ihren
   Urlaubszeiträumen an einem Ort verwalten. Wirkt sich
   automatisch auf die Personaleinsatzplanung aus (siehe
   state.js: getVacationOverlapsForSpan/employeeIsOnVacation) -
   hier werden nur die Urlaubszeiträume selbst gepflegt, es gibt
   keine weitere Datenhaltung.
   ========================================================= */

(function (global) {
  "use strict";

  let searchTerm = "";
  let flashEmployeeId = null;

  function render() {
    const body = document.getElementById("urlaubBody");
    if (!body) return;

    const search = searchTerm.trim().toLowerCase();
    let list = App.state.employees.slice().sort((a, b) => (a.nachname || "").localeCompare(b.nachname || "") || (a.vorname || "").localeCompare(b.vorname || ""));
    if (search) {
      list = list.filter((e) => (e.vorname + " " + e.nachname).toLowerCase().includes(search));
    }

    if (!list.length) {
      body.innerHTML = `<tr><td colspan="3" style="color:var(--color-text-faint); text-align:center; padding:30px;">Keine Mitarbeiter gefunden.</td></tr>`;
      return;
    }

    body.innerHTML = list.map(rowHtml).join("");

    list.forEach((e) => {
      const row = body.querySelector(`tr[data-emp="${e.id}"]`);
      if (!row) return;

      row.querySelectorAll(".u-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          const v = App.getVacation(btn.dataset.id);
          if (!v) return;
          if (confirm(`Urlaub (KW ${v.startWeek}/${v.startYear} – KW ${v.endWeek}/${v.endYear}) für ${(e.vorname + " " + e.nachname).trim()} löschen?`)) {
            App.deleteVacation(v.id);
            Toast.show("Urlaubseintrag gelöscht.");
          }
        });
      });

      const addBtn = row.querySelector(".u-add");
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          const data = {
            employeeId: e.id,
            startWeek: parseInt(row.querySelector(".u-start-week").value, 10),
            startYear: parseInt(row.querySelector(".u-start-year").value, 10),
            endWeek: parseInt(row.querySelector(".u-end-week").value, 10),
            endYear: parseInt(row.querySelector(".u-end-year").value, 10),
            bemerkung: row.querySelector(".u-bemerkung").value.trim()
          };
          if (!data.startWeek || !data.startYear || !data.endWeek || !data.endYear) {
            Toast.show("Bitte Start- und End-Kalenderwoche angeben.");
            return;
          }
          if (Util.compareWeeks({ year: data.startYear, week: data.startWeek }, { year: data.endYear, week: data.endWeek }) > 0) {
            Toast.show("Die End-Kalenderwoche darf nicht vor der Start-Kalenderwoche liegen.");
            return;
          }
          App.addVacation(data);
          Toast.show("Urlaub für " + (e.vorname + " " + e.nachname).trim() + " eingetragen.");
        });
      }

      if (flashEmployeeId === e.id) {
        row.classList.add("urlaub-row-flash");
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => row.classList.remove("urlaub-row-flash"), 2000);
        flashEmployeeId = null;
      }
    });
  }

  function chipHtml(v) {
    const overlapsAny = App.state.projects.some((p) =>
      Array.isArray(p.employeeIds) && p.employeeIds.includes(v.employeeId) && p.status !== "Storniert" &&
      App.getEmployeeAssignmentPeriods(p, v.employeeId).some((period) => {
        const pIdx = App.getSpan(period), vIdx = App.getSpan(v);
        return pIdx.startIdx <= vIdx.endIdx && vIdx.startIdx <= pIdx.endIdx;
      })
    );
    return `<li class="${overlapsAny ? "urlaub-chip-conflict" : ""}" title="${overlapsAny ? "Überschneidet sich mit einem Projekteinsatz – wird dort automatisch unterbrochen dargestellt" : ""}">
      KW ${v.startWeek}/${v.startYear} – KW ${v.endWeek}/${v.endYear}${v.bemerkung ? " · " + Util.escapeHtml(v.bemerkung) : ""}
      <button class="u-remove" data-id="${v.id}" aria-label="Entfernen">&times;</button>
    </li>`;
  }

  function rowHtml(e) {
    const fullName = (e.vorname + " " + e.nachname).trim() || "(ohne Namen)";
    const vacations = App.getVacationsForEmployee(e.id);
    const today = App.state.ui.weeks.find((w) => w.isToday) || { year: new Date().getFullYear(), week: 1 };

    return `<tr data-emp="${e.id}">
      <td>
        <strong>${Util.escapeHtml(fullName)}</strong><br>
        <span class="p-meta">${Util.escapeHtml(e.funktion || "–")}</span>
      </td>
      <td>
        <ul class="tag-list urlaub-chip-list">${vacations.length ? vacations.map(chipHtml).join("") : '<li style="background:none;border:none;color:var(--color-text-faint);padding-left:0;">Kein Urlaub eingetragen.</li>'}</ul>
      </td>
      <td>
        <div class="urlaub-add-row">
          <span>KW</span>
          <input type="number" class="inline-input u-start-week" min="1" max="53" value="${today.week}" style="width:52px;">
          <span>/</span>
          <input type="number" class="inline-input u-start-year" min="2020" max="2100" value="${today.year}" style="width:66px;">
          <span>–</span>
          <input type="number" class="inline-input u-end-week" min="1" max="53" value="${today.week}" style="width:52px;">
          <span>/</span>
          <input type="number" class="inline-input u-end-year" min="2020" max="2100" value="${today.year}" style="width:66px;">
          <input type="text" class="inline-input u-bemerkung" placeholder="Bemerkung (optional)" style="flex:1; min-width:100px;">
          <button class="btn btn-ghost u-add">+ Hinzufügen</button>
        </div>
      </td>
    </tr>`;
  }

  function bindToolbar() {
    const search = document.getElementById("urlaubSearch");
    if (search) {
      const debounced = Util.debounce((val) => { searchTerm = val; render(); }, 200);
      search.addEventListener("input", (e) => debounced(e.target.value));
    }
  }

  /** Wird von der Personaleinsatzplanung aufgerufen (Klick auf einen
   *  Urlaubsbalken), um direkt zur passenden Zeile zu springen. */
  function highlightEmployee(employeeId) {
    flashEmployeeId = employeeId;
    render();
  }

  global.Urlaub = { render, bindToolbar, highlightEmployee };
})(window);
