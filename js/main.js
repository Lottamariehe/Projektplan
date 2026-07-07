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
    fillSelect(document.getElementById("filterTag"), Storage.PROJECT_TAGS, App.state.ui.filters.tag);
    const projektartNames = (App.state.settings.projektarten || Storage.DEFAULT_PROJEKTARTEN).map((pa) => pa.name);
    fillSelect(document.getElementById("filterProjektart"), projektartNames, App.state.ui.filters.projektart);
    fillSelect(document.getElementById("filterAusschreibungStatus"), Storage.TENDER_STATUS, App.state.ui.tenderFilters.status);
    fillSelect(document.getElementById("filterAusschreibungGewerk"), Storage.TENDER_GEWERKE, App.state.ui.tenderFilters.gewerk);
    const zustList = Array.from(new Set(App.state.tenders.map((t) => t.zustaendigIntern).filter(Boolean)));
    fillSelect(document.getElementById("filterAusschreibungZustaendig"), zustList, App.state.ui.tenderFilters.zustaendig);

    const sortSel = document.getElementById("plannerSort");
    if (sortSel && !sortSel.options.length) {
      sortSel.innerHTML = Storage.PLANNER_SORT_MODES.map((m) => `<option value="${m.value}">${m.label}</option>`).join("");
    }
    if (sortSel) sortSel.value = App.state.ui.plannerSort;
  }

  function renderAll() {
    populateFilterOptions();
    Gantt.render();
    Capacity.render();
    Ausschreibungen.render();
    if (App.state.ui.view === "settings") renderSettingsView();
    if (App.state.ui.view === "mitarbeiter") Employees.render();
    if (App.state.ui.view === "personal") Personal.render();
    if (App.state.ui.view === "urlaub") Urlaub.render();
  }

  /* ---------------- Navigation ---------------- */

  function switchView(view) {
    App.state.ui.view = view;
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
    if (view === "settings") renderSettingsView();
    if (view === "mitarbeiter") Employees.render();
    if (view === "planner") setTimeout(() => Gantt.render(), 0);
    if (view === "personal") setTimeout(() => Personal.render(), 0);
    if (view === "urlaub") Urlaub.render();
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

    renderProjektartenList();
    renderPersonLimitsCard();
    renderPortalsCard();
    renderCriticalActionsCard();
    renderAdminCard();
  }

  /** Projektarten-Verwaltung: Name + Farbe, frei erweiterbar (siehe Aufgabe
   *  "Projektart und farbliche Kennzeichnung"). Lebt in settings.projektarten
   *  (JSON-Feld) - keine eigene DB-Tabelle. */
  function renderProjektartenList() {
    const s = App.state.settings;
    const list = document.getElementById("listProjektarten");
    if (!list) return;
    const arten = s.projektarten || (s.projektarten = Storage.DEFAULT_PROJEKTARTEN.slice());
    list.innerHTML = arten.map((pa, i) => `<li class="projektart-item">
        <span class="projektart-swatch" style="background:${Util.escapeHtml(pa.color)};"></span>
        <span class="projektart-name">${Util.escapeHtml(pa.name)}</span>
        <input type="color" class="projektart-color-input" data-i="${i}" value="${Util.escapeHtml(pa.color)}" title="Farbe ändern">
        <button data-i="${i}" aria-label="Entfernen">&times;</button>
      </li>`).join("") || `<li style="background:none;border:none;color:var(--color-text-faint);">Noch keine Projektarten angelegt.</li>`;

    list.querySelectorAll(".projektart-color-input").forEach((inp) => {
      inp.addEventListener("input", () => {
        arten[parseInt(inp.dataset.i, 10)].color = inp.value;
        App.scheduleSave();
        renderProjektartenList();
        App.emit("change");
      });
    });
    list.querySelectorAll("button[data-i]").forEach((btn) => {
      btn.addEventListener("click", () => {
        arten.splice(parseInt(btn.dataset.i, 10), 1);
        App.scheduleSave();
        renderSettingsView();
        populateFilterOptions();
        App.emit("change");
      });
    });
  }

  /** Optionale, standardmäßig deaktivierte Kapazitätsgrenzen je Projektleiter/
   *  Obermonteur (siehe Aufgabe "Konflikterkennung überarbeiten"). Ohne
   *  hinterlegtes Limit betreut eine Person beliebig viele Projekte
   *  gleichzeitig - das ist ausdrücklich kein Konflikt. */
  function renderPersonLimitsCard() {
    const s = App.state.settings;
    if (!s.projektleiterLimits) s.projektleiterLimits = {};
    if (!s.obermonteurLimits) s.obermonteurLimits = {};

    renderLimitList("listProjektleiterLimits", s.projektleiterLimits, "Projektleiter");
    renderLimitList("listObermonteurLimits", s.obermonteurLimits, "Obermonteur");

    fillSelect(document.getElementById("selectProjektleiterLimit"), s.projektleiter, "");
    fillSelect(document.getElementById("selectObermonteurLimit"), s.obermonteure, "");
  }

  function renderLimitList(ulId, limits, roleLabel) {
    const ul = document.getElementById(ulId);
    if (!ul) return;
    const names = Object.keys(limits);
    ul.innerHTML = names.length
      ? names.map((name) => `<li>${Util.escapeHtml(name)}: max. ${Util.escapeHtml(String(limits[name]))} gleichzeitige Projekte
          <button data-name="${Util.escapeHtml(name)}" aria-label="Limit entfernen">&times;</button></li>`).join("")
      : `<li style="background:none;border:none;color:var(--color-text-faint);">Kein Limit hinterlegt – unbegrenzt (Standard).</li>`;
    ul.querySelectorAll("button[data-name]").forEach((btn) => {
      btn.addEventListener("click", () => {
        delete limits[btn.dataset.name];
        App.scheduleSave();
        renderPersonLimitsCard();
        App.emit("change");
        Toast.show(roleLabel + "-Limit entfernt.");
      });
    });
  }

  function renderPortalsCard() {
    const list = document.getElementById("listPortale");
    if (!list) return;
    list.innerHTML = App.state.portals.map((p) =>
      `<li>${Util.escapeHtml(p.name)}${App.isAdmin ? `<button data-id="${p.id}" aria-label="Entfernen">&times;</button>` : ""}</li>`
    ).join("") || `<li style="background:none;border:none;color:var(--color-text-faint);">Noch keine Vergabeportale angelegt.</li>`;
    list.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (confirm("Vergabeportal endgültig löschen?")) {
          App.deletePortal(btn.dataset.id);
          renderSettingsView();
        }
      });
    });
  }

  function renderCriticalActionsCard() {
    const clearBtn = document.getElementById("btnClearAllData");
    const resetBtn = document.getElementById("btnResetDatabase");
    if (clearBtn) { clearBtn.disabled = !App.isAdmin; clearBtn.title = App.isAdmin ? "" : "Nur für Administratoren"; }
    if (resetBtn) { resetBtn.disabled = !App.isAdmin; resetBtn.title = App.isAdmin ? "" : "Nur für Administratoren"; }
    const hint = document.getElementById("criticalActionsHint");
    if (hint) hint.classList.toggle("hidden", App.isAdmin);
  }

  function renderAdminCard() {
    const card = document.getElementById("adminCard");
    if (!card) return;
    if (!App.isAdmin) { card.classList.add("hidden"); return; }
    card.classList.remove("hidden");
    Api.getAdminConfig().then((cfg) => {
      const list = document.getElementById("listAdminEmails");
      if (!list) return;
      list.innerHTML = (cfg.adminEmails || []).map((email, i) =>
        `<li>${Util.escapeHtml(email)}<button data-i="${i}" aria-label="Entfernen">&times;</button></li>`
      ).join("");
      list.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const emails = (cfg.adminEmails || []).slice();
          emails.splice(parseInt(btn.dataset.i, 10), 1);
          if (!emails.length) { Toast.show("Mindestens eine Admin-E-Mail-Adresse ist erforderlich."); return; }
          await Api.updateAdminConfig(emails);
          Toast.show("Admin-Liste aktualisiert.");
          renderAdminCard();
        });
      });
    }).catch(() => {});
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

    document.getElementById("btnAddProjektart").addEventListener("click", () => {
      const nameInput = document.getElementById("inputNeueProjektart");
      const colorInput = document.getElementById("inputNeueProjektartFarbe");
      const name = nameInput.value.trim();
      if (!name) return;
      const s = App.state.settings;
      if (!s.projektarten) s.projektarten = Storage.DEFAULT_PROJEKTARTEN.slice();
      if (s.projektarten.some((pa) => pa.name === name)) { Toast.show("Diese Projektart existiert bereits."); return; }
      s.projektarten.push({ name, color: colorInput.value || "#d6ebfb" });
      nameInput.value = "";
      App.scheduleSave();
      renderSettingsView();
      populateFilterOptions();
      Toast.show("Projektart hinzugefügt.");
    });

    document.getElementById("btnSetProjektleiterLimit").addEventListener("click", () => {
      const person = document.getElementById("selectProjektleiterLimit").value;
      const val = parseInt(document.getElementById("inputProjektleiterLimit").value, 10);
      if (!person || !val || val < 1) { Toast.show("Bitte Person und ein gültiges Limit (≥ 1) wählen."); return; }
      App.state.settings.projektleiterLimits[person] = val;
      document.getElementById("inputProjektleiterLimit").value = "";
      App.scheduleSave();
      renderPersonLimitsCard();
      App.emit("change");
      Toast.show("Limit für " + person + " gespeichert.");
    });

    document.getElementById("btnSetObermonteurLimit").addEventListener("click", () => {
      const person = document.getElementById("selectObermonteurLimit").value;
      const val = parseInt(document.getElementById("inputObermonteurLimit").value, 10);
      if (!person || !val || val < 1) { Toast.show("Bitte Person und ein gültiges Limit (≥ 1) wählen."); return; }
      App.state.settings.obermonteurLimits[person] = val;
      document.getElementById("inputObermonteurLimit").value = "";
      App.scheduleSave();
      renderPersonLimitsCard();
      App.emit("change");
      Toast.show("Limit für " + person + " gespeichert.");
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

    document.getElementById("btnClearAllData").addEventListener("click", () => {
      if (!App.isAdmin) return;
      if (confirm("Wirklich ALLE Projekte und Ausschreibungen unwiderruflich löschen?")) {
        App.clearAllData();
        renderSettingsView();
        Toast.show("Alle Projekte und Ausschreibungen wurden gelöscht.");
      }
    });

    document.getElementById("btnResetDatabase").addEventListener("click", () => {
      if (!App.isAdmin) return;
      if (confirm("Wirklich die GESAMTE Datenbank zurücksetzen (Projekte, Ausschreibungen, Mitarbeiter, Vergabeportale, Einstellungen)? Admin-E-Mail-Adressen bleiben erhalten. Das kann nicht rückgängig gemacht werden.")) {
        App.resetDatabase();
        renderSettingsView();
        Toast.show("Datenbank wurde zurückgesetzt.");
      }
    });

    document.getElementById("btnAddPortal").addEventListener("click", () => {
      const input = document.getElementById("inputNeuesPortal");
      const val = input.value.trim();
      if (!val) return;
      App.addPortal({ name: val, url: "", hinweis: "" });
      input.value = "";
      renderSettingsView();
      Toast.show("Vergabeportal hinzugefügt.");
    });

    const importBtn = document.getElementById("btnOpenImport");
    if (importBtn) importBtn.addEventListener("click", () => ImportWizard.open());

    const addAdminBtn = document.getElementById("btnAddAdminEmail");
    if (addAdminBtn) {
      addAdminBtn.addEventListener("click", async () => {
        const input = document.getElementById("inputNeueAdminEmail");
        const val = input.value.trim();
        if (!val) return;
        const cfg = await Api.getAdminConfig();
        const emails = (cfg.adminEmails || []).concat([val]);
        await Api.updateAdminConfig(emails);
        input.value = "";
        renderAdminCard();
        Toast.show("Administrator hinzugefügt.");
      });
    }
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
    document.getElementById("filterTag").addEventListener("change", (e) => {
      App.state.ui.filters.tag = e.target.value;
      App.emit("change");
    });
    document.getElementById("filterProjektart").addEventListener("change", (e) => {
      App.state.ui.filters.projektart = e.target.value;
      App.emit("change");
    });
    document.getElementById("toggleAusschreibungen").addEventListener("change", (e) => {
      App.state.ui.filters.showTenderPreview = e.target.checked;
      App.emit("change");
    });
    document.getElementById("plannerSort").addEventListener("change", (e) => {
      App.setPlannerSort(e.target.value);
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
    document.getElementById("filterAusschreibungGewerk").addEventListener("change", (e) => {
      App.state.ui.tenderFilters.gewerk = e.target.value;
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
      label.textContent = "Angemeldet als " + email + (App.isAdmin ? " · Administrator" : "");
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
    Employees.bindToolbar();
    Personal.bindToolbar();
    Urlaub.bindToolbar();

    document.getElementById("yearLabel").textContent = new Date().getFullYear();
    document.getElementById("yearLabelPersonal").textContent = new Date().getFullYear();

    renderAll();
    showCurrentUser();

    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("hidden");

    setTimeout(() => Gantt.scrollToToday(), 50);
  });
})(window);
