/* =========================================================
   personal.js – Personaleinsatzplanung: Mitarbeiter-zentrierte
   Gantt-Ansicht. Zeigt für jeden Mitarbeiter alle zugeordneten
   Projekte als Balken (Zeilen = Mitarbeiter statt Projekte).

   WICHTIG: Es werden hier KEINE eigenen Daten gehalten. Alles
   wird live aus App.state.projects + project_employees
   abgeleitet (siehe App.getVisiblePersonalEmployees in
   state.js). Ein verschobenes Projekt im Projektplaner wirkt
   sich automatisch hier aus – und umgekehrt.
   ========================================================= */

(function (global) {
  "use strict";

  const els = {};
  let dragBarState = null;

  const LANE_HEIGHT = 27;
  const ROW_PADDING = 15;
  const MIN_ROW_HEIGHT = 46;

  function cacheEls() {
    els.scroll = document.getElementById("personalScroll");
    els.inner = document.getElementById("personalInner");
    els.header = document.getElementById("personalHeader");
    els.side = document.getElementById("personalSide");
    els.body = document.getElementById("personalBody");
    els.banner = document.getElementById("personalConflictBanner");
  }

  /* ---------------- Rendering ---------------- */

  function render() {
    if (!els.scroll) cacheEls();
    if (!els.scroll) return; // Ansicht noch nicht im DOM (z. B. beim ersten Laden)

    populateFilterOptions();

    const colWidth = App.getColWidth();
    document.documentElement.style.setProperty("--col-width", colWidth + "px");

    const weeks = App.state.ui.weeks;
    const rows = buildRows();

    renderHeader(weeks);
    renderSideAndBody(rows, weeks, colWidth);
    updateConflictBanner(rows);
  }

  /** Baut die Zeilenliste (ein Eintrag je sichtbarem Mitarbeiter) inkl.
   *  Spurzuordnung (Stapelung bei gleichzeitigen Projekten/Einsatzabschnitten
   *  UND Urlaub in einer eigenen Spurgruppe) und kumulierter vertikaler
   *  Position (da jede Zeile eine andere Höhe haben kann). */
  function buildRows() {
    const data = App.getVisiblePersonalEmployees();
    let top = 0;
    return data.map(({ employee, assignments }) => {
      const withIdx = App.computeAssignmentConflicts(assignments);
      const assignLaneResult = App.assignLanes(withIdx);
      const laneRows = assignLaneResult.rows;
      const laneCount = withIdx.length ? assignLaneResult.laneCount : 0;

      // Urlaub bekommt eigene Spuren UNTER den Projekt-Spuren, damit er auch
      // sichtbar ist, wenn der Mitarbeiter gerade auf keinem Projekt eingeplant
      // ist (Aufgabe "Urlaubsverwaltung": Urlaub soll immer deutlich erkennbar sein).
      const vacationEntries = App.getVacationsForEmployee(employee.id).map((v) => ({ vacation: v, idx: App.getSpan(v) }));
      const vacationLaneResult = App.assignLanes(vacationEntries);
      const vacationLaneRows = vacationLaneResult.rows;
      const vacationLaneCount = vacationEntries.length ? vacationLaneResult.laneCount : 0;
      vacationLaneRows.forEach((vr) => {
        vr.overlapsAssignment = laneRows.some((lr) => lr.idx.startIdx <= vr.idx.endIdx && vr.idx.startIdx <= lr.idx.endIdx);
      });
      // Jedem Projekteinsatz die überlappenden Urlaubszeiträume anhängen, damit
      // der Balken die Unterbrechung visuell zeigen kann (Aufgabe "Projekte
      // während des Urlaubs automatisch unterbrechen").
      laneRows.forEach((lr) => {
        lr.vacationOverlaps = App.getVacationOverlapsForSpan(employee.id, lr.span);
      });

      const totalLanes = laneCount + vacationLaneCount;
      const height = Math.max(MIN_ROW_HEIGHT, totalLanes * LANE_HEIGHT + ROW_PADDING);
      const row = { employee, laneRows, laneCount, vacationLaneRows, vacationLaneCount, height, top };
      top += height;
      return row;
    });
  }

  function computeOccupiedWeeks(laneRows) {
    const set = new Set();
    laneRows.forEach((r) => { for (let i = r.idx.startIdx; i <= r.idx.endIdx; i++) set.add(i); });
    return set.size;
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
      els.side.innerHTML = `<div class="gantt-side-row" style="color:var(--color-text-faint);cursor:default;">Keine Mitarbeiter für die aktuelle Filterauswahl.</div>`;
      els.body.innerHTML = "";
      els.body.style.height = "var(--row-height)";
      return;
    }

    els.side.innerHTML = rows.map(buildSideRow).join("");
    els.body.innerHTML = buildRowBackgrounds(weeks, rows);
    els.body.style.height = rows.reduce((sum, r) => sum + r.height, 0) + "px";

    rows.forEach((row) => {
      row.laneRows.forEach((entry) => {
        els.body.appendChild(buildBarEl(row, entry, colWidth));
      });
      row.vacationLaneRows.forEach((entry) => {
        els.body.appendChild(buildVacationBarEl(row, entry, colWidth));
      });
    });

    Array.from(els.side.children).forEach((rowEl) => {
      const empId = rowEl.dataset.emp;
      if (!empId) return;
      bindSideRowClick(rowEl, empId);
      if (rowEl.hasAttribute("draggable")) bindSideRowDrag(rowEl, empId);
    });

    els.body.querySelectorAll(".gantt-row-bg, .gantt-cell-bg").forEach((el) => {
      el.addEventListener("click", clearHighlights);
    });
  }

  function buildRowBackgrounds(weeks, rows) {
    let cellsHtml = "";
    weeks.forEach((w) => {
      const classes = ["gantt-cell-bg"];
      if (w.isMonthStart) classes.push("month-start");
      if (w.isToday) classes.push("is-today");
      cellsHtml += `<div class="${classes.join(" ")}"></div>`;
    });
    return rows.map((r) => `<div class="gantt-row-bg" style="height:${r.height}px;">${cellsHtml}</div>`).join("");
  }

  function buildSideRow(row) {
    const e = row.employee;
    const fullName = (e.vorname + " " + e.nachname).trim() || "(ohne Namen)";
    const isActive = e.aktiv === undefined || e.aktiv === true || e.aktiv === 1;
    const metaParts = [e.funktion || "–"];
    if (e.team) metaParts.push(e.team);

    const showDetails = App.state.ui.personal.showDetails;
    const detailParts = [];
    if (showDetails) {
      if (e.qualifikation) detailParts.push(e.qualifikation);
      if (e.wochenarbeitszeit) detailParts.push(e.wochenarbeitszeit + " Std./Wo.");
      if (e.beschaeftigungsstatus) detailParts.push(e.beschaeftigungsstatus);
    }

    const occupied = computeOccupiedWeeks(row.laneRows);
    const hasDoubleBooking = row.laneRows.some((r) => r.conflicts.length);
    const hasVacationConflict = row.laneRows.some((r) => r.vacationOverlaps && r.vacationOverlaps.length) || row.vacationLaneRows.some((r) => r.overlapsAssignment);
    const hasConflict = hasDoubleBooking || hasVacationConflict;
    const highlightEmp = App.state.ui.personal.highlightEmployeeId;
    const dim = highlightEmp && highlightEmp !== e.id;
    const draggable = App.state.ui.personal.sort === "manuell";
    const vacationCount = row.vacationLaneRows.length;

    return `<div class="gantt-side-row personal-side-row ${dim ? "personal-row-dim" : ""} ${isActive ? "" : "row-inactive"}" data-emp="${e.id}" style="height:${row.height}px;" ${draggable ? 'draggable="true"' : ""}>
      <div class="personal-side-top">
        ${draggable ? '<span class="drag-handle" title="Ziehen zum Sortieren">⠿</span>' : ""}
        <span class="p-name">${Util.escapeHtml(fullName)}</span>
        ${vacationCount ? `<span class="vacation-icon" title="${vacationCount} Urlaubszeitraum/-zeiträume">🏖</span>` : ""}
        ${hasConflict ? '<span class="conflict-icon" title="Terminüberschneidung – siehe Balken">⚠</span>' : ""}
      </div>
      <span class="p-meta">${Util.escapeHtml(metaParts.join(" · "))}${detailParts.length ? " · " + Util.escapeHtml(detailParts.join(" · ")) : ""}</span>
      <span class="workload-badge">${row.laneRows.length} Projekt(e) · ${occupied} KW belegt</span>
    </div>`;
  }

  function buildBarEl(row, entry, colWidth) {
    const project = entry.project;
    const bar = document.createElement("div");
    bar.className = "gantt-bar personal-bar";
    bar.dataset.projectId = project.id;
    bar.dataset.empId = row.employee.id;

    const top = row.top + entry.lane * LANE_HEIGHT + 4;
    bar.style.top = top + "px";
    bar.style.height = (LANE_HEIGHT - 6) + "px";
    bar.style.left = (entry.idx.startIdx * colWidth) + "px";
    bar.style.width = Math.max(colWidth - 3, (entry.idx.endIdx - entry.idx.startIdx + 1) * colWidth - 3) + "px";
    bar.style.background = project.farbe || "#2f6fed";

    const ui = App.state.ui.personal;
    if (ui.highlightProjectId) {
      bar.classList.add(ui.highlightProjectId === project.id ? "personal-bar-highlight" : "personal-bar-dim");
    }
    if (ui.highlightEmployeeId && ui.highlightEmployeeId !== row.employee.id) {
      bar.classList.add("personal-bar-dim");
    }
    if (entry.conflicts.length) bar.classList.add("personal-bar-conflict");
    if (entry.hasOverride) bar.classList.add("personal-bar-override");
    if (entry.vacationOverlaps && entry.vacationOverlaps.length) bar.classList.add("personal-bar-vacation-overlap");

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = (entry.conflicts.length ? "⚠ " : "") + project.name;
    bar.appendChild(label);
    bar.title = buildBarTooltip(row.employee, entry);

    // Urlaubsüberschneidungen werden als Unterbrechung direkt auf dem Balken
    // sichtbar gemacht (Aufgabe "Projekte während des Urlaubs automatisch
    // unterbrechen") - rein visuell, ohne den zugrunde liegenden Einsatz-
    // zeitraum in der Datenbank zu verändern.
    (entry.vacationOverlaps || []).forEach((ov) => {
      const localLeft = (ov.startIdx - entry.idx.startIdx) * colWidth;
      const localWidth = (ov.endIdx - ov.startIdx + 1) * colWidth;
      const overlay = document.createElement("div");
      overlay.className = "bar-vacation-overlay";
      overlay.style.left = localLeft + "px";
      overlay.style.width = localWidth + "px";
      overlay.title = "Urlaub: KW " + ov.vacation.startWeek + "/" + ov.vacation.startYear + " – KW " + ov.vacation.endWeek + "/" + ov.vacation.endYear;
      bar.appendChild(overlay);
    });

    const leftHandle = document.createElement("div");
    leftHandle.className = "resize-handle left";
    const rightHandle = document.createElement("div");
    rightHandle.className = "resize-handle right";
    bar.appendChild(leftHandle);
    bar.appendChild(rightHandle);

    leftHandle.addEventListener("mousedown", (e) => startBarDrag(e, row.employee.id, project, entry, "resize-left", bar));
    rightHandle.addEventListener("mousedown", (e) => startBarDrag(e, row.employee.id, project, entry, "resize-right", bar));
    bar.addEventListener("mousedown", (e) => {
      if (e.target === leftHandle || e.target === rightHandle) return;
      startBarDrag(e, row.employee.id, project, entry, "move", bar);
    });
    bar.addEventListener("click", (e) => {
      if (dragBarState && dragBarState.moved) { e.stopPropagation(); return; }
      e.stopPropagation();
      toggleProjectHighlight(project.id);
    });
    bar.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      Modals.openProjectModal(project.id);
    });

    return bar;
  }

  /** Baut den Balken für einen Urlaubszeitraum (eigene Spur je Mitarbeiter,
   *  siehe buildRows). Nicht per Maus verschiebbar - Bearbeitung erfolgt in
   *  der Urlaubsplanung, ein Klick springt dorthin. */
  function buildVacationBarEl(row, entry, colWidth) {
    const v = entry.vacation;
    const bar = document.createElement("div");
    bar.className = "gantt-bar personal-bar vacation-bar" + (entry.overlapsAssignment ? " vacation-conflict" : "");
    bar.dataset.vacationId = v.id;

    const top = row.top + (row.laneCount + entry.lane) * LANE_HEIGHT + 4;
    bar.style.top = top + "px";
    bar.style.height = (LANE_HEIGHT - 6) + "px";
    bar.style.left = (entry.idx.startIdx * colWidth) + "px";
    bar.style.width = Math.max(colWidth - 3, (entry.idx.endIdx - entry.idx.startIdx + 1) * colWidth - 3) + "px";

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = "Urlaub" + (v.bemerkung ? " – " + v.bemerkung : "");
    bar.appendChild(label);

    const fullName = (row.employee.vorname + " " + row.employee.nachname).trim();
    bar.title = `Urlaub: ${fullName}\nZeitraum: KW ${v.startWeek}/${v.startYear} – KW ${v.endWeek}/${v.endYear}`
      + (v.bemerkung ? `\nBemerkung: ${v.bemerkung}` : "")
      + (entry.overlapsAssignment ? "\n⚠ überschneidet sich mit einem Projekteinsatz" : "")
      + "\n\nKlick: in der Urlaubsplanung öffnen";

    bar.addEventListener("click", (e) => {
      e.stopPropagation();
      const navBtn = document.querySelector('.nav-btn[data-view="urlaub"]');
      if (navBtn) navBtn.click();
      if (global.Urlaub && global.Urlaub.highlightEmployee) global.Urlaub.highlightEmployee(row.employee.id);
    });

    return bar;
  }

  function buildBarTooltip(employee, entry) {
    const p = entry.project;
    const s = entry.span;
    const weeksCount = entry.idx ? (entry.idx.endIdx - entry.idx.startIdx + 1) : App.getSpan(s).endIdx - App.getSpan(s).startIdx + 1;
    const tagsLine = Array.isArray(p.tags) && p.tags.length ? `\nTags: ${p.tags.join(", ")}` : "";
    let t = `${p.name}\nMitarbeiter: ${(employee.vorname + " " + employee.nachname).trim()}`
      + `\nAuftraggeber: ${p.auftraggeber || "–"}`
      + `\nZeitraum: KW ${s.startWeek}/${s.startYear} – KW ${s.endWeek}/${s.endYear}${entry.hasOverride ? " (eigener Einsatzabschnitt)" : (s.phaseId ? " (automatisch je Bauabschnitt)" : " (gesamte Projektlaufzeit)")}`
      + `\nDauer: ${weeksCount} KW`
      + `\nProjektleiter: ${p.projektleiter || "–"} · Obermonteur: ${p.obermonteur || "–"}`
      + `\nStatus: ${p.status}${tagsLine}`;
    if (entry.conflicts.length) t += `\n⚠ Terminüberschneidung mit: ${entry.conflicts.map((c) => c.name).join(", ")}`;
    if (entry.vacationOverlaps && entry.vacationOverlaps.length) {
      t += `\n⚠ Unterbrochen durch Urlaub: ` + entry.vacationOverlaps.map((ov) =>
        `KW ${App.state.ui.weeks[ov.startIdx].week}/${App.state.ui.weeks[ov.startIdx].year} – KW ${App.state.ui.weeks[ov.endIdx].week}/${App.state.ui.weeks[ov.endIdx].year}`
      ).join(", ");
    }
    t += "\n\nKlick: hervorheben · Doppelklick: bearbeiten · Ziehen: Einsatzabschnitt anpassen";
    return t;
  }

  function updateConflictBanner(rows) {
    if (!els.banner) return;
    const conflicted = rows.filter((r) =>
      r.laneRows.some((lr) => lr.conflicts.length || (lr.vacationOverlaps && lr.vacationOverlaps.length)) ||
      r.vacationLaneRows.some((vr) => vr.overlapsAssignment)
    );
    if (conflicted.length) {
      els.banner.className = "capacity-warning critical";
      els.banner.textContent = "Terminüberschneidung/Urlaubskollision bei " + conflicted.length + " Mitarbeiter(n): "
        + conflicted.map((r) => (r.employee.vorname + " " + r.employee.nachname).trim()).join(", ");
      els.banner.classList.remove("hidden");
    } else {
      els.banner.classList.add("hidden");
    }
  }

  /* ---------------- Hervorhebung (Kreuz-Verknüpfung Projekt <-> Mitarbeiter) ---------------- */

  function toggleEmployeeHighlight(employeeId) {
    const ui = App.state.ui.personal;
    ui.highlightEmployeeId = ui.highlightEmployeeId === employeeId ? null : employeeId;
    ui.highlightProjectId = null;
    render();
  }

  function toggleProjectHighlight(projectId) {
    const ui = App.state.ui.personal;
    ui.highlightProjectId = ui.highlightProjectId === projectId ? null : projectId;
    ui.highlightEmployeeId = null;
    render();
  }

  function clearHighlights() {
    const ui = App.state.ui.personal;
    if (!ui.highlightEmployeeId && !ui.highlightProjectId) return;
    ui.highlightEmployeeId = null;
    ui.highlightProjectId = null;
    render();
  }

  function bindSideRowClick(rowEl, employeeId) {
    rowEl.addEventListener("click", (e) => {
      if (e.target.closest(".drag-handle")) return;
      toggleEmployeeHighlight(employeeId);
    });
  }

  /* ---------------- Manuelle Sortierung per Drag-and-drop ---------------- */

  function bindSideRowDrag(rowEl, employeeId) {
    rowEl.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", employeeId);
      rowEl.classList.add("dragging-row");
    });
    rowEl.addEventListener("dragend", () => rowEl.classList.remove("dragging-row"));
    rowEl.addEventListener("dragover", (e) => { e.preventDefault(); rowEl.classList.add("drop-target"); });
    rowEl.addEventListener("dragleave", () => rowEl.classList.remove("drop-target"));
    rowEl.addEventListener("drop", (e) => {
      e.preventDefault();
      rowEl.classList.remove("drop-target");
      const draggedId = e.dataTransfer.getData("text/plain");
      if (!draggedId || draggedId === employeeId) return;
      reorderAfterDrop(draggedId, employeeId);
    });
  }

  function reorderAfterDrop(draggedId, targetId) {
    const ids = App.state.employees.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((e) => e.id);
    const fromIdx = ids.indexOf(draggedId);
    if (fromIdx === -1) return;
    ids.splice(fromIdx, 1);
    const insertAt = ids.indexOf(targetId);
    ids.splice(insertAt === -1 ? ids.length : insertAt, 0, draggedId);
    App.reorderEmployees(ids);
    Toast.show("Reihenfolge aktualisiert.");
  }

  /* ---------------- Balken-Drag: individueller Zeitraum je Mitarbeiter ---------------- */
  /* Verschieben/Verlängern eines Balkens in dieser Ansicht ändert NICHT den
     Projektzeitraum selbst (der bleibt für alle Mitarbeiter gemeinsam),
     sondern hinterlegt/aktualisiert einen individuellen Einsatzzeitraum
     dieses Mitarbeiters innerhalb der bestehenden Projektlaufzeit. */

  function startBarDrag(e, employeeId, project, entry, mode, barEl) {
    e.preventDefault();
    e.stopPropagation();
    const colWidth = App.getColWidth();
    dragBarState = {
      mode, employeeId, project, entry,
      startX: e.clientX,
      originStartIdx: entry.idx.startIdx,
      originEndIdx: entry.idx.endIdx,
      newStartIdx: entry.idx.startIdx,
      newEndIdx: entry.idx.endIdx,
      colWidth,
      moved: false,
      barEl: barEl || null
    };
    if (dragBarState.barEl) dragBarState.barEl.classList.add("dragging");
    document.addEventListener("mousemove", onBarDragMove);
    document.addEventListener("mouseup", onBarDragEnd);
  }

  function onBarDragMove(e) {
    if (!dragBarState) return;
    const deltaWeeks = Math.round((e.clientX - dragBarState.startX) / dragBarState.colWidth);
    if (deltaWeeks !== 0) dragBarState.moved = true;

    const projSpan = App.getSpan(dragBarState.project);
    const span = dragBarState.originEndIdx - dragBarState.originStartIdx;
    let newStart = dragBarState.originStartIdx;
    let newEnd = dragBarState.originEndIdx;

    if (dragBarState.mode === "move") {
      newStart = Util.clamp(dragBarState.originStartIdx + deltaWeeks, projSpan.startIdx, projSpan.endIdx - span);
      newEnd = newStart + span;
    } else if (dragBarState.mode === "resize-left") {
      newStart = Util.clamp(dragBarState.originStartIdx + deltaWeeks, projSpan.startIdx, dragBarState.originEndIdx);
      newEnd = dragBarState.originEndIdx;
    } else if (dragBarState.mode === "resize-right") {
      newEnd = Util.clamp(dragBarState.originEndIdx + deltaWeeks, dragBarState.originStartIdx, projSpan.endIdx);
      newStart = dragBarState.originStartIdx;
    }

    dragBarState.newStartIdx = newStart;
    dragBarState.newEndIdx = newEnd;

    if (dragBarState.barEl) {
      dragBarState.barEl.style.left = (newStart * dragBarState.colWidth) + "px";
      dragBarState.barEl.style.width = Math.max(dragBarState.colWidth - 3, (newEnd - newStart + 1) * dragBarState.colWidth - 3) + "px";
    }
  }

  function onBarDragEnd() {
    if (!dragBarState) return;
    document.removeEventListener("mousemove", onBarDragMove);
    document.removeEventListener("mouseup", onBarDragEnd);
    if (dragBarState.barEl) dragBarState.barEl.classList.remove("dragging");

    if (dragBarState.moved) {
      const weeks = App.state.ui.weeks;
      const startWeek = weeks[dragBarState.newStartIdx];
      const endWeek = weeks[dragBarState.newEndIdx];
      const project = dragBarState.project;
      const employeeId = dragBarState.employeeId;
      const periodId = dragBarState.entry.periodId;
      const newSpan = { startYear: startWeek.year, startWeek: startWeek.week, endYear: endWeek.year, endWeek: endWeek.week };

      // Nur DIESER Einsatzabschnitt wird verändert - alle anderen Abschnitte
      // (auch andere Abschnitte desselben Mitarbeiters auf demselben Projekt)
      // bleiben unangetastet.
      const assignmentPeriods = {};
      Object.keys(project.assignmentPeriods || {}).forEach((empId) => {
        assignmentPeriods[empId] = (project.assignmentPeriods[empId] || []).map((p) => Object.assign({}, p));
      });
      const list = assignmentPeriods[employeeId] ? assignmentPeriods[employeeId].slice() : [];
      if (periodId) {
        const idx = list.findIndex((p) => p.id === periodId);
        if (idx >= 0) list[idx] = Object.assign({}, list[idx], newSpan);
        else list.push(Object.assign({ id: null }, newSpan));
      } else {
        const phases = App.getProjectPhases(project);
        const draggedPhaseId = dragBarState.entry.span && dragBarState.entry.span.phaseId;
        if (!list.length && phases.length && draggedPhaseId) {
          // Der Mitarbeiter folgte bisher implizit ALLEN Bauabschnitten (kein
          // eigener Einsatzabschnitt hinterlegt). Beim Ziehen EINES Abschnitts
          // müssen alle Abschnitte als eigene Einsatzabschnitte übernommen
          // werden - sonst würden die übrigen (nicht gezogenen) Abschnitte
          // beim Speichern verschwinden.
          phases.forEach((ph) => {
            if (ph.id === draggedPhaseId) {
              list.push(Object.assign({ id: null }, newSpan));
            } else {
              list.push({ id: null, startYear: ph.startYear, startWeek: ph.startWeek, endYear: ph.endYear, endWeek: ph.endWeek });
            }
          });
        } else {
          // Bisher galt die gesamte Projektlaufzeit (kein eigener Abschnitt) -
          // durch das Ziehen entsteht jetzt der erste eigene Einsatzabschnitt.
          list.push(Object.assign({ id: null }, newSpan));
        }
      }
      assignmentPeriods[employeeId] = list;

      App.updateProject(project.id, { employeeIds: (project.employeeIds || []).slice(), assignmentPeriods });
      Toast.show("Einsatzabschnitt aktualisiert.");
    } else {
      render();
    }
    dragBarState = null;
  }

  /* ---------------- Toolbar / Filter ---------------- */

  function fillSelect(sel, values, selected) {
    if (!sel) return;
    const placeholder = sel.options[0];
    sel.innerHTML = "";
    if (placeholder) sel.appendChild(placeholder);
    (values || []).forEach((v) => {
      if (!v) return;
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
    sel.value = selected || "";
  }

  function fillSelectPairs(sel, pairs, selected) {
    if (!sel) return;
    const placeholder = sel.options[0];
    sel.innerHTML = "";
    if (placeholder) sel.appendChild(placeholder);
    (pairs || []).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.value;
      opt.textContent = p.label;
      sel.appendChild(opt);
    });
    sel.value = selected || "";
  }

  function populateFilterOptions() {
    const f = App.state.ui.personal.filters;
    fillSelect(document.getElementById("personalFilterLeiter"), App.state.settings.projektleiter, f.leiter);
    fillSelect(document.getElementById("personalFilterOber"), App.state.settings.obermonteure, f.ober);
    fillSelect(document.getElementById("personalFilterTag"), Storage.PROJECT_TAGS, f.tag);
    fillSelect(document.getElementById("personalFilterStatus"), Storage.PROJECT_STATUS, f.status);

    const funktionen = Array.from(new Set(App.state.employees.map((e) => e.funktion).filter(Boolean))).sort();
    fillSelect(document.getElementById("personalFilterFunktion"), funktionen, f.funktion);

    const projectPairs = App.state.projects.slice().sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ value: p.id, label: p.name }));
    fillSelectPairs(document.getElementById("personalFilterProjekt"), projectPairs, f.projekt);

    const empPairs = App.state.employees.slice().sort((a, b) => (a.nachname || "").localeCompare(b.nachname || ""))
      .map((e) => ({ value: e.id, label: (e.vorname + " " + e.nachname).trim() }));
    fillSelectPairs(document.getElementById("personalFilterMitarbeiter"), empPairs, f.mitarbeiter);

    const sortSel = document.getElementById("personalSort");
    if (sortSel && !sortSel.options.length) {
      sortSel.innerHTML = Storage.PERSONAL_SORT_MODES.map((m) => `<option value="${m.value}">${m.label}</option>`).join("");
    }
    if (sortSel) sortSel.value = App.state.ui.personal.sort;

    const detailsToggle = document.getElementById("personalToggleDetails");
    if (detailsToggle) detailsToggle.checked = App.state.ui.personal.showDetails;
  }

  function bindToolbar() {
    const sortSel = document.getElementById("personalSort");
    if (sortSel) sortSel.addEventListener("change", (e) => { App.state.ui.personal.sort = e.target.value; render(); });

    const detailsToggle = document.getElementById("personalToggleDetails");
    if (detailsToggle) detailsToggle.addEventListener("change", (e) => { App.state.ui.personal.showDetails = e.target.checked; render(); });

    const filterMap = {
      personalFilterMitarbeiter: "mitarbeiter",
      personalFilterFunktion: "funktion",
      personalFilterProjekt: "projekt",
      personalFilterLeiter: "leiter",
      personalFilterOber: "ober",
      personalFilterTag: "tag",
      personalFilterStatus: "status"
    };
    Object.keys(filterMap).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", (e) => {
        App.state.ui.personal.filters[filterMap[id]] = e.target.value;
        render();
      });
    });

    const search = document.getElementById("personalSearch");
    if (search) {
      const debounced = Util.debounce((val) => { App.state.ui.personal.search = val; render(); }, 200);
      search.addEventListener("input", (e) => debounced(e.target.value));
    }

    const btnToday = document.getElementById("btnTodayPersonal");
    if (btnToday) btnToday.addEventListener("click", scrollToToday);
    const btnPrev = document.getElementById("btnPrevYearPersonal");
    if (btnPrev) btnPrev.addEventListener("click", () => {
      const y = parseInt(document.getElementById("yearLabelPersonal").textContent, 10) - 1;
      document.getElementById("yearLabelPersonal").textContent = y;
      scrollToYear(y);
    });
    const btnNext = document.getElementById("btnNextYearPersonal");
    if (btnNext) btnNext.addEventListener("click", () => {
      const y = parseInt(document.getElementById("yearLabelPersonal").textContent, 10) + 1;
      document.getElementById("yearLabelPersonal").textContent = y;
      scrollToYear(y);
    });

    const btnXlsx = document.getElementById("btnExportPersonalXlsx");
    if (btnXlsx) btnXlsx.addEventListener("click", () => Exporter.exportPersonalXlsx());
    const btnPrint = document.getElementById("btnPrintPersonal");
    if (btnPrint) btnPrint.addEventListener("click", () => window.print());
  }

  function scrollToToday() {
    const weeks = App.state.ui.weeks;
    const idx = weeks.findIndex((w) => w.isToday);
    if (idx < 0 || !els.scroll) return;
    const colWidth = App.getColWidth();
    els.scroll.scrollLeft = Math.max(0, idx * colWidth - els.scroll.clientWidth / 2);
  }

  function scrollToYear(year) {
    const weeks = App.state.ui.weeks;
    const idx = weeks.findIndex((w) => w.year === year && w.week === 1);
    if (idx < 0 || !els.scroll) return;
    els.scroll.scrollLeft = App.getColWidth() * idx;
  }

  global.Personal = { render, bindToolbar, cacheEls };
})(window);
