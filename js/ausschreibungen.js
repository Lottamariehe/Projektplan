/* =========================================================
   ausschreibungen.js – Tabellarische Ausschreibungsübersicht
   ========================================================= */

(function (global) {
  "use strict";

  const STATUS_STYLE = {
    "In Bearbeitung": { bg: "#eaf1ff", fg: "#1f52c4" },
    "Angebot abgegeben": { bg: "#fdf3e2", fg: "#8a6416" },
    "Auftrag erhalten": { bg: "#e5f7ef", fg: "#1f6e4e" },
    "Abgesagt": { bg: "#eceff3", fg: "#5b6270" },
    "Nicht teilgenommen": { bg: "#eceff3", fg: "#5b6270" },
    "Verloren": { bg: "#fdeae5", fg: "#9a3520" }
  };

  const COLUMNS = [
    { key: "name", label: "Ausschreibung / Bauvorhaben", sortable: true },
    { key: "auftraggeber", label: "Auftraggeber", sortable: true },
    { key: "ansprechpartner", label: "Ansprechpartner", sortable: true },
    { key: "adresse", label: "Projektadresse", sortable: false },
    { key: "submissionDatum", label: "Submission", sortable: true },
    { key: "submissionUhrzeit", label: "Uhrzeit", sortable: false },
    { key: "zeitraum", label: "Geplanter Ausführungszeitraum", sortable: false },
    { key: "startWeek", label: "Start-KW", sortable: true },
    { key: "endWeek", label: "End-KW", sortable: true },
    { key: "angebotsstatus", label: "Status", sortable: true },
    { key: "auftragswert", label: "Auftragswert (geschätzt)", sortable: true },
    { key: "zustaendigIntern", label: "Zuständig intern", sortable: true },
    { key: "bearbeitungsfrist", label: "Bearbeitungsfrist", sortable: true },
    { key: "bemerkungen", label: "Bemerkungen", sortable: false },
    { key: "unterlagenLink", label: "Unterlagen", sortable: false },
    { key: "aktionen", label: "", sortable: false }
  ];

  function renderHead() {
    const row = document.getElementById("ausschreibungenHeadRow");
    const sort = App.state.ui.tenderSort;
    row.innerHTML = COLUMNS.map((col) => {
      const arrow = sort.key === col.key ? `<span class="sort-arrow">${sort.dir === "asc" ? "▲" : "▼"}</span>` : "";
      return `<th data-key="${col.key}" ${col.sortable ? "" : 'style="cursor:default;"'}>${col.label}${arrow}</th>`;
    }).join("");

    row.querySelectorAll("th").forEach((th, i) => {
      const col = COLUMNS[i];
      if (!col.sortable) return;
      th.addEventListener("click", () => {
        const s = App.state.ui.tenderSort;
        if (s.key === col.key) s.dir = s.dir === "asc" ? "desc" : "asc";
        else { s.key = col.key; s.dir = "asc"; }
        render();
      });
    });
  }

  function render() {
    renderHead();
    const body = document.getElementById("ausschreibungenBody");
    const list = App.getFilteredTenders();

    if (!list.length) {
      body.innerHTML = `<tr><td colspan="${COLUMNS.length}" style="color:var(--color-text-faint); text-align:center; padding:30px;">Keine Ausschreibungen gefunden.</td></tr>`;
      return;
    }

    body.innerHTML = list.map(rowHtml).join("");

    list.forEach((t) => {
      const editBtns = body.querySelectorAll(`[data-edit="${t.id}"]`);
      editBtns.forEach((b) => b.addEventListener("click", () => Modals.openTenderModal(t.id)));
      const delBtns = body.querySelectorAll(`[data-del="${t.id}"]`);
      delBtns.forEach((b) => b.addEventListener("click", () => {
        if (confirm(`Ausschreibung „${t.name}“ wirklich löschen?`)) App.deleteTender(t.id);
      }));
      const convBtns = body.querySelectorAll(`[data-conv="${t.id}"]`);
      convBtns.forEach((b) => b.addEventListener("click", () => {
        const project = App.convertTenderToProject(t.id);
        if (project) Toast.show(`Ausschreibung in Projekt „${project.name}“ umgewandelt.`);
      }));
    });
  }

  function rowHtml(t) {
    const style = STATUS_STYLE[t.angebotsstatus] || { bg: "#eceff3", fg: "#444" };
    const zeitraum = `KW ${t.startWeek}/${t.startYear} – KW ${t.endWeek}/${t.endYear}`;
    const canConvert = t.angebotsstatus === "Auftrag erhalten" && !t.linkedProjectId;
    const link = t.unterlagenLink
      ? (/^https?:\/\//i.test(t.unterlagenLink)
          ? `<a href="${Util.escapeHtml(t.unterlagenLink)}" target="_blank" rel="noopener">Öffnen</a>`
          : Util.escapeHtml(t.unterlagenLink))
      : "–";

    return `<tr>
      <td>${Util.escapeHtml(t.name)}</td>
      <td>${Util.escapeHtml(t.auftraggeber)}</td>
      <td>${Util.escapeHtml(t.ansprechpartner)}</td>
      <td>${Util.escapeHtml(t.adresse)}</td>
      <td>${Util.formatDateDE(t.submissionDatum)}</td>
      <td>${Util.escapeHtml(t.submissionUhrzeit)}</td>
      <td>${zeitraum}</td>
      <td>${t.startWeek}/${t.startYear}</td>
      <td>${t.endWeek}/${t.endYear}</td>
      <td><span class="status-pill" style="background:${style.bg};color:${style.fg}">${t.angebotsstatus}${t.linkedProjectId ? " · im Plan" : ""}</span></td>
      <td>${Util.formatCurrency(t.auftragswert)}</td>
      <td>${Util.escapeHtml(t.zustaendigIntern)}</td>
      <td>${Util.formatDateDE(t.bearbeitungsfrist)}</td>
      <td style="white-space:normal; max-width:220px;">${Util.escapeHtml(t.bemerkungen)}</td>
      <td class="link-cell">${link}</td>
      <td>
        <div class="row-actions">
          <button data-edit="${t.id}">Bearbeiten</button>
          ${canConvert ? `<button class="convert" data-conv="${t.id}">→ Projekt</button>` : ""}
          <button class="delete" data-del="${t.id}">Löschen</button>
        </div>
      </td>
    </tr>`;
  }

  global.Ausschreibungen = { render, STATUS_STYLE, COLUMNS };
})(window);
