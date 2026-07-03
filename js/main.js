/* =========================================================
   main.js – Initialisierung, Navigation, Toolbar-Bindings,
   Einstellungen und Toast-Benachrichtigungen.
   ========================================================= */

(function (global) {
  "use strict";

  const Toast = {
    show(msg) {
      const root = document.getElementById("toastRoot");
      if (!root) return;
      const el = document.createElement("div");
      el.className = "toast";
      el.textContent = msg;
      root.appendChild(el);
      setTimeout(() => {
        el.style.transition = "opacity 300ms";
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 300);
      }, 2600);
    }
  };
  global.Toast = Toast;

  function fillSelect(sel, values, selected) {
    if (!sel) return;
    const placeholder = sel.options[0];
    sel.innerHTML = "";
    sel.appendChild(placeholder);
    (values || []).forEach((v) => {
      if (!v) return;
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
    sel.value = selected || "";
  }

  function populateFilterOptions() {
    fillSelect(document.getElementById("filterStatus"), Storage.PROJECT_STATUS, App.state.ui.filters.status);
    fillSelect(document.getElementById("filterLeiter"), App.state.settings.projektleiter, App.state.ui.filters.leiter);
    fillSelect(document.getElementById("filterAusschreibungStatus"), Storage.TENDER_STATUS, App.state.ui.tenderFilters.status);
    const zustList = Array.from(new Set(App.state.tenders.map((t) => t.zustaendigIntern).filter(Boolean)));
    fillSelect(document.getElementById("filterAusschreibungZustaendig"), zustList, App.state.ui.tenderFilters.zustaendig);
  }

  function renderAll() {
    populateFilterOptions();
    Gantt.render();
    Capacity.render();
    Ausschreibungen.render();
    if (App.state.ui.view === "settings") renderSettingsView();
  }

  /* ---------------- Navigation ---------------- */

  function switchView(view) {
    App.state.ui.view = view;
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
    if (view === "settings") renderSettingsView();
    if (view === "planner") setTimeout(() => Gantt.render(), 0);
  }

  /* ---------------- Einstellungen ---------------- */

  function renderTagList(ulId, values, onRemove) {
    const ul = document.getElementById(ulId);
    ul.innerHTML = values.map((v, i) =>
      `<li>${Util.escapeHtml(v)}<button data-i="${i}" aria-label="Entfernen">&times;</button></li>`
    ).join("");
    ul.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => onRemove(parseInt(btn.dataset.i, 10)));
    });
  }

  function renderSettingsView() {
    const s = App.state.settings;

    renderTagList("listProjektleiter", s.projektleiter, (i) => {
      s.projektleiter.splice(i, 1);
      App.scheduleSave();
      renderSettingsView();
      populateFilterOptions();
    });
    renderTagList("listObermonteure", s.obermonteure, (i) => {
      s.obermonteure.splice(i, 1);
      App.scheduleSave();
      renderSettingsView();
    });

    document.getElementById("settingWarnProjekte").value = s.warnProjekte;
    document.getElementById("settingKritischProjekte").value = s.kritischProjekte;
    document.getElementById("settingMitarbeiterGesamt").value = s.mitarbeiterGesamt;

    document.getElementById("colorPalette").innerHTML = (s.colorPalette || []).map((c) =>
      `<div class="color-swatch" style="background:${c};" title="${c}"></div>`
    ).join("");
  }

  function bindSettingsEvents() {
    document.getElementById("btnAddProjektleiter").addEventListener("click", () => {
      const input = document.getElementById("inputNeuerProjektleiter");
      const val = input.value.trim();
      if (!val) return;
      App.state.settings.projektleiter.push(val);
      input.value = "";
      App.scheduleSave();
      renderSettingsView();
      populateFilterOptions();
      Toast.show("Projektleiter hinzugefügt.");
    });

    document.getElementById("btnAddObermonteur").addEventListener("click", () => {
      const input = document.getElementById("inputNeuerObermonteur");
      const val = input.value.trim();
      if (!val) return;
      App.state.settings.obermonteure.push(val);
      input.value = "";
      App.scheduleSave();
      renderSettingsView();
      Toast.show("Obermonteur hinzugefügt.");
    });

    document.getElementById("btnSaveSettings").addEventListener("click", () => {
      const s = App.state.settings;
      s.warnProjekte = parseInt(document.getElementById("settingWarnProjekte").value, 10) || 3;
      s.kritischProjekte = parseInt(document.getElementById("settingKritischProjekte").value, 10) || 5;
      s.mitarbeiterGesamt = parseInt(document.getElementById("settingMitarbeiterGesamt").value, 10) || 1;
      App.scheduleSave();
      App.emit("change");
      Toast.show("Einstellungen gespeichert.");
    });

    document.getElementById("btnResetDemoData").addEventListener("click", () => {
      if (confirm("Alle aktuellen Daten werden durch die Beispieldaten ersetzt. Fortfahren?")) {
        App.resetToSampleData();
        renderSettingsView();
        Toast.show("Beispieldaten wurden geladen.");
      }
    });

    document.getElementById("btnClearAllData").addEventListener("click", () => {
      if (confirm("Wirklich ALLE Projekte und Ausschreibungen unwiderruflich löschen?")) {
        App.clearAllData();
        renderSettingsView();
        Toast.show("Alle Daten wurden gelöscht.");
      }
    });
  }

  /* ---------------- Toolbar-Bindings ---------------- */

  function bindToolbar() {
    document.getElementById("btnNewProject").addEventListener("click", () => Modals.openProjectModal(null));
    document.getElementById("btnNewAusschreibung").addEventListener("click", () => Modals.openTenderModal(null));

    document.getElementById("btnToday").addEventListener("click", () => Gantt.scrollToToday());
    document.getElementById("btnPrevYear").addEventListener("click", () => {
      const y = parseInt(document.getElementById("yearLabel").textContent, 10) - 1;
      document.getElementById("yearLabel").textContent = y;
      Gantt.scrollToYear(y);
    });
    document.getElementById("btnNextYear").addEventListener("click", () => {
      const y = parseInt(document.getElementById("yearLabel").textContent, 10) + 1;
      document.getElementById("yearLabel").textContent = y;
      Gantt.scrollToYear(y);
    });

    document.querySelectorAll(".zoom-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".zoom-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        App.setZoom(btn.dataset.zoom);
      });
    });

    document.getElementById("filterStatus").addEventListener("change", (e) => {
      App.state.ui.filters.status = e.target.value;
      App.emit("change");
    });
    document.getElementById("filterLeiter").addEventListener("change", (e) => {
      App.state.ui.filters.leiter = e.target.value;
      App.emit("change");
    });
    document.getElementById("toggleAusschreibungen").addEventListener("change", (e) => {
      App.state.ui.filters.showTenderPreview = e.target.checked;
      App.emit("change");
    });
    document.getElementById("toggleShowMitarbeiter").addEventListener("change", (e) => {
      App.state.ui.filters.showMitarbeiter = e.target.checked;
      Capacity.render();
    });

    document.getElementById("btnExportProjects").addEventListener("click", () => Exporter.exportProjects());
    document.getElementById("btnPrintPlanner").addEventListener("click", () => window.print());

    document.getElementById("filterAusschreibungStatus").addEventListener("change", (e) => {
      App.state.ui.tenderFilters.status = e.target.value;
      App.emit("change");
    });
    document.getElementById("filterAusschreibungZustaendig").addEventListener("change", (e) => {
      App.state.ui.tenderFilters.zustaendig = e.target.value;
      App.emit("change");
    });
    document.getElementById("btnExportAusschreibungen").addEventListener("click", () => Exporter.exportTenders());

    const search = document.getElementById("globalSearch");
    const debouncedSearch = Util.debounce((val) => {
      App.state.ui.search = val;
      App.emit("change");
    }, 200);
    search.addEventListener("input", (e) => debouncedSearch(e.target.value));

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });
  }

  function bindScrollSync() {
    const ganttScroll = document.getElementById("ganttScroll");
    const capacityScroll = document.getElementById("capacityScroll");
    let syncing = false;
    ganttScroll.addEventListener("scroll", () => {
      if (syncing) return;
      syncing = true;
      capacityScroll.scrollLeft = ganttScroll.scrollLeft;
      updateYearLabelFromScroll(ganttScroll.scrollLeft);
      syncing = false;
    });
    capacityScroll.addEventListener("scroll", () => {
      if (syncing) return;
      syncing = true;
      ganttScroll.scrollLeft = capacityScroll.scrollLeft;
      syncing = false;
    });
  }

  function updateYearLabelFromScroll(scrollLeft) {
    const colWidth = App.getColWidth();
    const idx = Util.clamp(Math.round(scrollLeft / colWidth), 0, App.state.ui.weeks.length - 1);
    const week = App.state.ui.weeks[idx];
    if (week) document.getElementById("yearLabel").textContent = week.year;
  }

  /* ---------------- Init ---------------- */

  async function showCurrentUser() {
    const label = document.getElementById("currentUserLabel");
    if (!label) return;
    // 1) Von /api/bootstrap mitgelieferte Identität (Cloudflare Access Header)
    let email = App.currentUser;
    // 2) Fallback: direkter Aufruf der Access-Identity-Schnittstelle
    if (!email) {
      const identity = await Api.currentIdentity();
      if (identity && (identity.email || identity.name)) email = identity.email || identity.name;
    }
    if (email) {
      label.textContent = "Angemeldet als " + email;
      label.classList.remove("hidden");
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    App.on("saveState", (status) => {
      const el = document.getElementById("saveIndicator");
      el.classList.remove("saving", "error");
      if (status === "saving") {
        el.textContent = "Speichert …";
        el.classList.add("saving");
      } else if (status === "error") {
        el.textContent = "Fehler beim Speichern";
        el.classList.add("error");
      } else {
        el.textContent = "Gespeichert";
      }
    });

    await App.init();
    App.on("change", renderAll);

    bindToolbar();
    bindSettingsEvents();
    bindScrollSync();

    document.getElementById("yearLabel").textContent = new Date().getFullYear();

    renderAll();
    showCurrentUser();

    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("hidden");

    setTimeout(() => Gantt.scrollToToday(), 50);
  });
})(window);
