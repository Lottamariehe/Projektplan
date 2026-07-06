/* =========================================================
   capacity.js – Kapazitätsleiste unterhalb des Gantt-Planers
   ========================================================= */

(function (global) {
  "use strict";

  let barsEl = null;

  function cacheEls() {
    barsEl = document.getElementById("capacityBars");
  }

  function render() {
    const data = App.computeCapacity();
    renderBars(data.counts, data.staff, data.previewCounts, data.previewStaff);
  }

  /** Live-Vorschau während des Ziehens eines Balkens (ohne den State zu verändern).
   *  override: { besetzung, originIdx:{startIdx,endIdx}, newIdx:{startIdx,endIdx} }
   *  – bewusst unabhängig vom Projekt-/Bauabschnitts-Konzept gehalten, damit
   *  sowohl das Verschieben eines ganzen Projekts als auch das Verschieben
   *  eines einzelnen Bauabschnitts dieselbe Vorschau-Logik nutzen können. */
  function renderWithOverride(override) {
    if (!override) { render(); return; }

    const base = App.computeCapacity();
    const counts = base.counts.slice();
    const staff = base.staff.slice();
    const preview = base.previewCounts ? base.previewCounts.slice() : null;
    const previewStaff = base.previewStaff ? base.previewStaff.slice() : null;
    const besetzung = override.besetzung || 0;
    const original = override.originIdx;
    const updated = override.newIdx;

    for (let i = original.startIdx; i <= original.endIdx; i++) {
      counts[i] -= 1;
      staff[i] -= besetzung;
      if (preview) { preview[i] -= 1; previewStaff[i] -= besetzung; }
    }
    for (let i = updated.startIdx; i <= updated.endIdx; i++) {
      counts[i] += 1;
      staff[i] += besetzung;
      if (preview) { preview[i] += 1; previewStaff[i] += besetzung; }
    }

    renderBars(counts, staff, preview, previewStaff);
  }

  function renderBars(counts, staff, previewCounts, previewStaff) {
    if (!barsEl) cacheEls();
    const colWidth = App.getColWidth();
    const showPreview = !!previewCounts && App.state.ui.filters.showTenderPreview;
    const showStaffRow = App.state.ui.filters.showMitarbeiter;
    const mitarbeiterGesamt = App.state.settings.mitarbeiterGesamt || 1;

    let countsHtml = "";
    counts.forEach((c, i) => {
      const level = App.capacityLevel(c);
      const extra = showPreview ? (previewCounts[i] - c) : 0;
      let label = c > 0 ? String(c) : "";
      if (extra > 0) label = (label || "0") + "+" + extra;
      const cls = extra > 0 && level !== "critical" ? App.capacityLevel(previewCounts[i]) : level;
      countsHtml += `<div class="capacity-cell ${cls === "empty" && !label ? "empty" : cls}" title="KW: ${c} Projekt(e)${extra > 0 ? " (+" + extra + " durch Ausschreibungsvorschau)" : ""}">${label}</div>`;
    });

    let staffHtml = "";
    staff.forEach((s, i) => {
      const ratio = s / mitarbeiterGesamt;
      let cls = "empty";
      if (s > 0) cls = ratio > 1 ? "critical" : (ratio >= 0.8 ? "warn" : "ok");
      const extra = showPreview ? (previewStaff[i] - s) : 0;
      let label = s > 0 ? String(s) : "";
      if (extra > 0) label = (label || "0") + "+" + extra;
      if (extra > 0) {
        const previewRatio = previewStaff[i] / mitarbeiterGesamt;
        cls = previewRatio > 1 ? "critical" : (previewRatio >= 0.8 ? "warn" : "ok");
      }
      staffHtml += `<div class="capacity-cell ${label ? cls : "empty"}" title="${s} von ${mitarbeiterGesamt} Mitarbeitenden gebunden${extra > 0 ? " (+" + extra + " durch Ausschreibungsvorschau)" : ""}">${label}</div>`;
    });

    const rows = [`<div class="capacity-row" data-row="count" style="width:${counts.length * colWidth}px">${countsHtml}</div>`];
    if (showStaffRow) {
      rows.push(`<div class="capacity-row" data-row="staff" style="width:${staff.length * colWidth}px">${staffHtml}</div>`);
    }
    barsEl.innerHTML = rows.join("");

    document.querySelectorAll(".capacity-row-label").forEach((el, i) => {
      el.style.display = (i === 1 && !showStaffRow) ? "none" : "flex";
    });
  }

  global.Capacity = { render, renderWithOverride, cacheEls };
})(window);
