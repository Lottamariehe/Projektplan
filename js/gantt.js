/* =========================================================
   gantt.js – Gantt-Ansicht: Kalenderwochen-Raster, Balken,
   Drag-and-drop, Größenänderung, Ausschreibungs-Vorschau.
   ========================================================= */

(function (global) {
  "use strict";

  const els = {};
  let dragState = null;
  let rafPending = false;

  function cacheEls() {
    els.scroll = document.getElementById("ganttScroll");
    els.inner = document.getElementById("ganttInner");
    els.header = document.getElementById("ganttHeader");
    els.side = document.getElementById("ganttSide");
    els.body = document.getElementById("ganttBody");
    els.capacityScroll = document.getElementById("capacityScroll");
    els.warning = document.getElementById("capacityWarning");
  }

  function render() {
    if (!els.scroll) cacheEls();
    const colWidth = App.getColWidth();
    document.documentElement.style.setProperty("--col-width", colWidth + "px");

    const weeks = App.state.ui.weeks;
    const rows = buildRowList();

    renderHeader(weeks);
    renderSideAndBody(rows, weeks, colWidth);
    updateWarningBanner();
    syncScrollWidth();
  }

  /** Kombinierte Zeilenliste: sichtbare Projekte + Ausschreibungs-Vorschauen. */
  function buildRowList() {
    const rows = App.getVisibleProjects().map((p) => ({ kind: "project", item: p }));
    App.getVisibleTendersForPlanner().forEach((t) => rows.push({ kind: "tender", item: t }));
    return rows;
  }

  function renderHeader(weeks) {
    let html = "";
    weeks.forEach((w) => {
      const classes = ["gantt-header-cell"];
      if (w.isMonthStart) classes.push("month-start");
      if (w.isToday) classes.push("is-today");
      html += `<div class="${classes.join(" ")}" data-idx="${w.index}">`
        + `<span class="kw-num">${w.week}</span>`
        + (w.isMonthStart ? `<span class="kw-month">${w.monthLabel} ${String(w.year).slice(2)}</span>` : "")
        + `</div>`;
    });
    els.header.innerHTML = html;
  }

  function renderSideAndBody(rows, weeks, colWidth) {
    if (!rows.length) {
      els.side.innerHTML = `<div class="gantt-side-row" style="color:var(--color-text-faint);cursor:default;">Keine Projekte für die aktuelle Filterauswahl.</div>`;
      els.body.innerHTML = buildRowBackgrounds(weeks, 1);
      els.body.style.height = "var(--row-height)";
      return;
    }

    let sideHtml = "";
    let bodyBgHtml = buildRowBackgrounds(weeks, rows.length);

    rows.forEach((row) => {
      sideHtml += buildSideRow(row);
    });

    els.side.innerHTML = sideHtml;
    els.body.innerHTML = bodyBgHtml;
    els.body.style.height = (rows.length * getRowHeightPx()) + "px";

    // Balken als absolut positionierte Elemente einfügen
    rows.forEach((row, rowIndex) => {
      const barEl = buildBarEl(row, rowIndex, colWidth);
      els.body.appendChild(barEl);
    });

    // Klick auf Seitenzeile öffnet Detail/Bearbeiten
    Array.from(els.side.children).forEach((rowEl, i) => {
      rowEl.addEventListener("click", () => openDetails(rows[i]));
    });
  }

  function getRowHeightPx() {
    const val = getComputedStyle(document.documentElement).getPropertyValue("--row-height");
    return parseInt(val, 10) || 44;
  }

  function buildRowBackgrounds(weeks, rowCount) {
    let rowHtml = "";
    weeks.forEach((w) => {
      const classes = ["gantt-cell-bg"];
      if (w.isMonthStart) classes.push("month-start");
      if (w.isToday) classes.push("is-today");
      rowHtml += `<div class="${classes.join(" ")}"></div>`;
    });
    let out = "";
    for (let i = 0; i < rowCount; i++) {
      out += `<div class="gantt-row-bg">${rowHtml}</div>`;
    }
    return out;
  }

  function buildSideRow(row) {
    const item = row.item;
    if (row.kind === "project") {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const tagHtml = tags.length
        ? `<span class="mini-tags">${tags.slice(0, 3).map((t) => `<span class="mini-tag">${Util.escapeHtml(t)}</span>`).join("")}${tags.length > 3 ? `<span class="mini-tag">+${tags.length - 3}</span>` : ""}</span>`
        : "";
      return `<div class="gantt-side-row" data-id="${item.id}" data-kind="project">
        <span class="p-name">${Util.escapeHtml(item.name)}</span>
        <span class="p-meta">${Util.escapeHtml(item.projektleiter || "–")} · ${Util.escapeHtml(item.obermonteur || "–")} · ${(item.employeeIds || []).length || item.besetzung || 0} MA${tagHtml}</span>
      </div>`;
    }
    return `<div class="gantt-side-row" data-id="${item.id}" data-kind="tender">
      <span class="p-name">${Util.escapeHtml(item.name)} <span style="color:var(--color-text-faint); font-weight:600;">(Ausschreibung)</span></span>
      <span class="p-meta">${Util.escapeHtml(item.auftraggeber || "–")} · Submission ${Util.formatDateDE(item.submissionDatum)}</span>
    </div>`;
  }

  function buildBarEl(row, rowIndex, colWidth) {
    const item = row.item;
    const { startIdx, endIdx } = App.getSpan(item);
    const rowHeight = getRowHeightPx();

    const bar = document.createElement("div");
    bar.className = "gantt-bar" + (row.kind === "tender" ? " preview-bar" : "");
    bar.dataset.id = item.id;
    bar.dataset.kind = row.kind;
    bar.style.top = (rowIndex * rowHeight + 7) + "px";
    bar.style.left = (startIdx * colWidth) + "px";
    bar.style.width = Math.max(colWidth - 3, (endIdx - startIdx + 1) * colWidth - 3) + "px";

    if (row.kind === "project") {
      bar.style.background = item.farbe || "#2f6fed";
    } else {
      bar.style.background = "#8b93a3";
      if (App.tenderOverlapsAnyProject(item)) bar.classList.add("overlap");
    }

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = item.name;
    bar.appendChild(label);
    bar.title = buildTooltip(row);

    if (row.kind === "project") {
      const leftHandle = document.createElement("div");
      leftHandle.className = "resize-handle left";
      const rightHandle = document.createElement("div");
      rightHandle.className = "resize-handle right";
      bar.appendChild(leftHandle);
      bar.appendChild(rightHandle);

      leftHandle.addEventListener("mousedown", (e) => startDrag(e, item, "resize-left"));
      rightHandle.addEventListener("mousedown", (e) => startDrag(e, item, "resize-right"));
      bar.addEventListener("mousedown", (e) => {
        if (e.target === leftHandle || e.target === rightHandle) return;
        startDrag(e, item, "move");
      });
      bar.addEventListener("click", (e) => {
        if (dragState && dragState.moved) { e.stopPropagation(); return; }
        openDetails(row);
      });
    } else {
      bar.addEventListener("click", () => openDetails(row));
    }

    return bar;
  }

  function buildTooltip(row) {
    const item = row.item;
    if (row.kind === "project") {
      const names = App.employeeNames(item.employeeIds);
      const tagLine = Array.isArray(item.tags) && item.tags.length ? `\nTags: ${item.tags.join(", ")}` : "";
      const mitarbeiterLine = names.length ? `\nMitarbeiter: ${names.join(", ")}` : "";
      return `${item.name}\nAuftraggeber: ${item.auftraggeber || "–"}\nProjektleiter: ${item.projektleiter || "–"}\nObermonteur: ${item.obermonteur || "–"}\nBesetzung: ${item.besetzung || 0} Mitarbeitende\nStatus: ${item.status}\nZeitraum: KW ${item.startWeek}/${item.startYear} – KW ${item.endWeek}/${item.endYear}${tagLine}${mitarbeiterLine}`;
    }
    const gewerkeLine = Array.isArray(item.gewerke) && item.gewerke.length ? `\nGewerke: ${item.gewerke.join(", ")}` : "";
    return `Ausschreibung: ${item.name}\nAuftraggeber: ${item.auftraggeber || "–"}\nStatus: ${item.angebotsstatus}\nGeplanter Zeitraum: KW ${item.startWeek}/${item.startYear} – KW ${item.endWeek}/${item.endYear}${gewerkeLine}\nKlicken zum Bearbeiten / Umwandeln.`;
  }

  function openDetails(row) {
    if (dragState) return;
    if (row.kind === "project") Modals.openProjectModal(row.item.id);
    else Modals.openTenderModal(row.item.id);
  }

  /* ---------------- Drag & Resize ---------------- */

  function startDrag(e, project, mode) {
    e.preventDefault();
    e.stopPropagation();
    const colWidth = App.getColWidth();
    const span = App.getSpan(project);
    dragState = {
      mode,
      project,
      startX: e.clientX,
      originStartIdx: span.startIdx,
      originEndIdx: span.endIdx,
      newStartIdx: span.startIdx,
      newEndIdx: span.endIdx,
      colWidth,
      moved: false,
      barEl: document.querySelector(`.gantt-bar[data-id="${project.id}"]`)
    };
    if (dragState.barEl) dragState.barEl.classList.add("dragging");
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
  }

  function onDragMove(e) {
    if (!dragState) return;
    const weeks = App.state.ui.weeks;
    const deltaWeeks = Math.round((e.clientX - dragState.startX) / dragState.colWidth);
    if (deltaWeeks !== 0) dragState.moved = true;

    let newStart = dragState.originStartIdx;
    let newEnd = dragState.originEndIdx;
    const span = dragState.originEndIdx - dragState.originStartIdx;
    const maxIdx = weeks.length - 1;

    if (dragState.mode === "move") {
      newStart = Util.clamp(dragState.originStartIdx + deltaWeeks, 0, maxIdx - span);
      newEnd = newStart + span;
    } else if (dragState.mode === "resize-left") {
      newStart = Util.clamp(dragState.originStartIdx + deltaWeeks, 0, dragState.originEndIdx);
      newEnd = dragState.originEndIdx;
    } else if (dragState.mode === "resize-right") {
      newEnd = Util.clamp(dragState.originEndIdx + deltaWeeks, dragState.originStartIdx, maxIdx);
      newStart = dragState.originStartIdx;
    }

    dragState.newStartIdx = newStart;
    dragState.newEndIdx = newEnd;

    if (dragState.barEl) {
      dragState.barEl.style.left = (newStart * dragState.colWidth) + "px";
      dragState.barEl.style.width = Math.max(dragState.colWidth - 3, (newEnd - newStart + 1) * dragState.colWidth - 3) + "px";
    }

    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        Capacity.renderWithOverride(buildDragOverride());
      });
    }
  }

  function buildDragOverride() {
    if (!dragState) return null;
    return {
      projectId: dragState.project.id,
      startIdx: dragState.newStartIdx,
      endIdx: dragState.newEndIdx
    };
  }

  function onDragEnd() {
    if (!dragState) return;
    const weeks = App.state.ui.weeks;
    if (dragState.barEl) dragState.barEl.classList.remove("dragging");
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);

    if (dragState.moved) {
      const startWeek = weeks[dragState.newStartIdx];
      const endWeek = weeks[dragState.newEndIdx];
      App.updateProject(dragState.project.id, {
        startYear: startWeek.year,
        startWeek: startWeek.week,
        endYear: endWeek.year,
        endWeek: endWeek.week
      });
      Toast.show("Projekt „" + dragState.project.name + "“ aktualisiert.");
    }
    const wasMoved = dragState.moved;
    dragState = null;
    if (!wasMoved) Capacity.render();
  }

  /* ---------------- Navigation & Sync ---------------- */

  function syncScrollWidth() {
    // Kapazitätsleiste und Gantt teilen sich dieselbe Spaltenbreite;
    // Scrollpositionen werden in main.js synchronisiert.
  }

  function scrollToToday() {
    const weeks = App.state.ui.weeks;
    const idx = weeks.findIndex((w) => w.isToday);
    if (idx < 0 || !els.scroll) return;
    const colWidth = App.getColWidth();
    const target = Math.max(0, idx * colWidth - els.scroll.clientWidth / 2);
    els.scroll.scrollLeft = target;
    if (els.capacityScroll) els.capacityScroll.scrollLeft = target;
  }

  function scrollToYear(year) {
    const weeks = App.state.ui.weeks;
    const idx = weeks.findIndex((w) => w.year === year && w.week === 1);
    if (idx < 0 || !els.scroll) return;
    const colWidth = App.getColWidth();
    els.scroll.scrollLeft = idx * colWidth;
    if (els.capacityScroll) els.capacityScroll.scrollLeft = idx * colWidth;
  }

  function updateWarningBanner() {
    if (!els.warning) return;
    const weeks = App.state.ui.weeks;
    const todayIdx = weeks.findIndex((w) => w.isToday);
    const { counts } = App.computeCapacity();
    const nearCritical = [];
    const nearWarn = [];
    counts.forEach((c, i) => {
      if (todayIdx >= 0 && (i < todayIdx - 2 || i > todayIdx + 26)) return;
      const level = App.capacityLevel(c);
      if (level === "critical") nearCritical.push(weeks[i]);
      else if (level === "warn") nearWarn.push(weeks[i]);
    });

    if (nearCritical.length) {
      els.warning.className = "capacity-warning critical";
      els.warning.textContent = "Kritische Auslastung in KW " +
        nearCritical.map((w) => w.week + "/" + w.year).join(", ") +
        " – bitte Kapazitäten prüfen, bevor weitere Projekte eingeplant werden.";
      els.warning.classList.remove("hidden");
    } else if (nearWarn.length) {
      els.warning.className = "capacity-warning";
      els.warning.textContent = "Erhöhte Auslastung in KW " +
        nearWarn.map((w) => w.week + "/" + w.year).join(", ") + ".";
      els.warning.classList.remove("hidden");
    } else {
      els.warning.classList.add("hidden");
    }
  }

  global.Gantt = { render, scrollToToday, scrollToYear, cacheEls };
})(window);
