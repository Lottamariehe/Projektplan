/* =========================================================
   state.js – zentraler Anwendungszustand
   Ein einfacher Publish/Subscribe-Store ohne Framework.
   Jede Mutation ruft App.emit('change') auf; main.js
   registriert sich darauf und rendert die Ansichten neu.

   Persistenz: Wenn unter /api ein Backend erreichbar ist
   (Cloudflare Pages Functions + D1), werden alle Änderungen
   dorthin gespeichert und beim Start von dort geladen. Ist
   kein Backend erreichbar (z. B. lokales Öffnen der Datei),
   fällt die App automatisch auf Local Storage zurück – die
   Bedienung bleibt in beiden Fällen identisch.
   ========================================================= */

(function (global) {
  "use strict";

  const ZOOM_COL_WIDTH = { month: 110, quarter: 60, half: 34, year: 20 };
  const TENDER_PREVIEW_STATUSES = ["In Bearbeitung", "Angebot abgegeben", "Auftrag erhalten"];

  const App = {
    state: {
      projects: [],
      tenders: [],
      employees: [],
      portals: [],
      settings: null,
      ui: {
        view: "planner",
        zoom: "year",
        weeks: [],
        weekIndex: {},
        focusedYear: new Date().getFullYear(),
        filters: { status: "", leiter: "", tag: "", showTenderPreview: true, showMitarbeiter: true },
        tenderFilters: { status: "", zustaendig: "", gewerk: "" },
        search: "",
        tenderSort: { key: "submissionDatum", dir: "asc" }
      }
    },
    listeners: { change: [], saveState: [] },
    backendMode: false,
    currentUser: null,
    isAdmin: false,

    /* ---------------- Lifecycle ---------------- */

    async init() {
      let backendData = null;
      try {
        backendData = await Api.bootstrap();
        this.backendMode = true;
      } catch (e) {
        this.backendMode = false;
      }

      if (this.backendMode) {
        this.currentUser = backendData.user || null;
        this.isAdmin = !!backendData.isAdmin;
        this.state.projects = backendData.projects || [];
        this.state.tenders = backendData.tenders || [];
        this.state.employees = backendData.employees || [];
        this.state.portals = backendData.portals || [];
        this.state.settings = Object.assign(Storage.defaultSettings(), backendData.settings || {});
      } else {
        // Kein Backend erreichbar -> lokaler Zwischenspeicher (ohne Demo-/Testdaten).
        const raw = Storage.loadRaw();
        if (raw && Array.isArray(raw.projects) && Array.isArray(raw.tenders)) {
          this.state.projects = raw.projects;
          this.state.tenders = raw.tenders;
          this.state.employees = raw.employees || [];
          this.state.portals = raw.portals || [];
          this.state.settings = Object.assign(Storage.defaultSettings(), raw.settings || {});
        } else {
          this.state.projects = [];
          this.state.tenders = [];
          this.state.employees = [];
          this.state.portals = [];
          this.state.settings = Storage.defaultSettings();
          this._localSaveAllNow();
        }
        // Ohne Backend gibt es keine serverseitige Admin-Prüfung -> im
        // lokalen Nur-Browser-Modus alle kritischen Aktionen erlauben.
        this.isAdmin = true;
      }

      this.generateWeeks();
    },

    /** Kritische Aktion: alle Projekte & Ausschreibungen löschen (nur Admin). */
    async clearAllData() {
      if (this.backendMode) {
        this.emit("saveState", "saving");
        try {
          await Api.adminReset("clearData");
          this.emit("saveState", "saved");
        } catch (err) {
          this.emit("saveState", "error");
          Toast.show("Löschen fehlgeschlagen: " + err.message);
          return;
        }
      }
      this.state.projects = [];
      this.state.tenders = [];
      if (!this.backendMode) this._localSaveAllNow();
      this.emit("change");
    },

    /** Kritische Aktion: komplette Datenbank zurücksetzen (nur Admin). Admin-Konfiguration bleibt erhalten. */
    async resetDatabase() {
      if (this.backendMode) {
        this.emit("saveState", "saving");
        try {
          await Api.adminReset("fullReset");
          this.emit("saveState", "saved");
        } catch (err) {
          this.emit("saveState", "error");
          Toast.show("Zurücksetzen fehlgeschlagen: " + err.message);
          return;
        }
      }
      this.state.projects = [];
      this.state.tenders = [];
      this.state.employees = [];
      this.state.portals = [];
      this.state.settings = Storage.defaultSettings();
      if (!this.backendMode) this._localSaveAllNow();
      this.emit("change");
    },

    /* ---------------- Events ---------------- */

    on(evt, fn) {
      if (!this.listeners[evt]) this.listeners[evt] = [];
      this.listeners[evt].push(fn);
    },
    emit(evt, payload) {
      (this.listeners[evt] || []).forEach((fn) => fn(payload));
    },

    /* ---------------- Persistenz ---------------- */

    /** Führt eine (asynchrone) Speicheraktion aus und meldet den Status über 'saveState'. */
    _persist(fn) {
      this.emit("saveState", "saving");
      Promise.resolve()
        .then(fn)
        .then(() => this.emit("saveState", "saved"))
        .catch((err) => {
          console.error(err);
          this.emit("saveState", "error");
          Toast.show("Speichern fehlgeschlagen – bitte Internetverbindung prüfen.");
        });
    },

    _localSaveAllNow() {
      Storage.saveRaw({
        projects: this.state.projects,
        tenders: this.state.tenders,
        employees: this.state.employees,
        portals: this.state.portals,
        settings: this.state.settings
      });
    },

    /** Öffentliche Methode für Einstellungsänderungen (Stammdaten, Kapazitätsgrenzen). */
    scheduleSave() {
      if (this.backendMode) {
        if (!this._debouncedSettingsSave) {
          this._debouncedSettingsSave = Util.debounce(() => {
            this._persist(() => Api.updateSettings(this.state.settings));
          }, 350);
        }
        this._debouncedSettingsSave();
      } else {
        if (!this._debouncedLocalSave) {
          this._debouncedLocalSave = Util.debounce(() => {
            this.emit("saveState", "saving");
            this._localSaveAllNow();
            this.emit("saveState", "saved");
          }, 350);
        }
        this._debouncedLocalSave();
      }
    },

    /* ---------------- Zeitachse (Kalenderwochen) ---------------- */

    generateWeeks() {
      const todayInfo = Util.isoWeekInfo(new Date());
      const startYear = todayInfo.year - 1;
      const endYear = todayInfo.year + 2;
      const weeks = [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      for (let year = startYear; year <= endYear; year++) {
        const total = Util.isoWeeksInYear(year);
        for (let week = 1; week <= total; week++) {
          const monday = Util.mondayOfISOWeek(year, week);
          weeks.push({ year, week, monday, key: year + "-" + week });
        }
      }

      weeks.forEach((w, i) => {
        const prev = weeks[i - 1];
        w.isMonthStart = !prev ||
          prev.monday.getMonth() !== w.monday.getMonth() ||
          prev.monday.getFullYear() !== w.monday.getFullYear();
        w.monthLabel = Util.MONTH_NAMES_SHORT[w.monday.getMonth()];
        const weekEnd = Util.addDays(w.monday, 6);
        w.isToday = now >= w.monday && now <= weekEnd;
        w.index = i;
      });

      const weekIndex = {};
      weeks.forEach((w) => { weekIndex[w.key] = w.index; });

      this.state.ui.weeks = weeks;
      this.state.ui.weekIndex = weekIndex;
    },

    getWeekIndex(year, week) {
      const key = year + "-" + week;
      const idx = this.state.ui.weekIndex[key];
      if (idx !== undefined) return idx;
      // Fallback: außerhalb des generierten Bereichs -> an den Rand klemmen
      const weeks = this.state.ui.weeks;
      if (!weeks.length) return 0;
      const first = weeks[0], last = weeks[weeks.length - 1];
      if (year < first.year || (year === first.year && week < first.week)) return 0;
      return weeks.length - 1;
    },

    getSpan(item) {
      const startIdx = this.getWeekIndex(item.startYear, item.startWeek);
      const endIdx = Math.max(startIdx, this.getWeekIndex(item.endYear, item.endWeek));
      return { startIdx, endIdx };
    },

    getColWidth() {
      return ZOOM_COL_WIDTH[this.state.ui.zoom] || ZOOM_COL_WIDTH.year;
    },

    setZoom(zoom) {
      if (!ZOOM_COL_WIDTH[zoom]) return;
      this.state.ui.zoom = zoom;
      this.emit("change");
    },

    /* ---------------- Projekte: CRUD ---------------- */

    addProject(data) {
      const now = new Date().toISOString();
      const project = Object.assign({ id: Util.uid("proj"), createdAt: now, updatedAt: now }, data);
      this.state.projects.push(project);
      this._persist(() => this.backendMode ? Api.createProject(project) : this._localSaveAllDebounced());
      this.emit("change");
      return project;
    },

    updateProject(id, data) {
      const p = this.state.projects.find((x) => x.id === id);
      if (!p) return null;
      Object.assign(p, data, { updatedAt: new Date().toISOString() });
      this._persist(() => this.backendMode ? Api.updateProject(id, p) : this._localSaveAllDebounced());
      this.emit("change");
      return p;
    },

    deleteProject(id) {
      this.state.projects = this.state.projects.filter((x) => x.id !== id);
      this._persist(() => this.backendMode ? Api.deleteProject(id) : this._localSaveAllDebounced());
      this.emit("change");
    },

    getProject(id) {
      return this.state.projects.find((x) => x.id === id) || null;
    },

    /* ---------------- Mitarbeiter: CRUD ---------------- */

    addEmployee(data) {
      const now = new Date().toISOString();
      const employee = Object.assign({ id: Util.uid("emp"), createdAt: now, updatedAt: now, aktiv: true }, data);
      this.state.employees.push(employee);
      this._persist(() => this.backendMode ? Api.createEmployee(employee) : this._localSaveAllDebounced());
      this.emit("change");
      return employee;
    },

    updateEmployee(id, data) {
      const e = this.state.employees.find((x) => x.id === id);
      if (!e) return null;
      Object.assign(e, data, { updatedAt: new Date().toISOString() });
      this._persist(() => this.backendMode ? Api.updateEmployee(id, e) : this._localSaveAllDebounced());
      this.emit("change");
      return e;
    },

    deleteEmployee(id) {
      this.state.employees = this.state.employees.filter((x) => x.id !== id);
      this.state.projects.forEach((p) => {
        if (Array.isArray(p.employeeIds)) p.employeeIds = p.employeeIds.filter((eid) => eid !== id);
      });
      this._persist(() => this.backendMode ? Api.deleteEmployee(id) : this._localSaveAllDebounced());
      this.emit("change");
    },

    getEmployee(id) {
      return this.state.employees.find((x) => x.id === id) || null;
    },

    getActiveEmployees() {
      return this.state.employees.filter((e) => e.aktiv === undefined || e.aktiv === true || e.aktiv === 1);
    },

    /** Namen zu einer Liste von Mitarbeiter-IDs auflösen (für Anzeige/Tooltip). */
    employeeNames(ids) {
      return (ids || []).map((id) => {
        const e = this.getEmployee(id);
        return e ? (e.vorname + " " + e.nachname).trim() : null;
      }).filter(Boolean);
    },

    /* ---------------- Vergabeportale: CRUD ---------------- */

    addPortal(data) {
      const now = new Date().toISOString();
      const portal = Object.assign({ id: Util.uid("portal"), createdAt: now, updatedAt: now }, data);
      this.state.portals.push(portal);
      this._persist(() => this.backendMode ? Api.createPortal(portal) : this._localSaveAllDebounced());
      this.emit("change");
      return portal;
    },

    updatePortal(id, data) {
      const p = this.state.portals.find((x) => x.id === id);
      if (!p) return null;
      Object.assign(p, data, { updatedAt: new Date().toISOString() });
      this._persist(() => this.backendMode ? Api.updatePortal(id, p) : this._localSaveAllDebounced());
      this.emit("change");
      return p;
    },

    deletePortal(id) {
      this.state.portals = this.state.portals.filter((x) => x.id !== id);
      this.state.tenders.forEach((t) => { if (t.portalId === id) t.portalId = null; });
      this._persist(() => this.backendMode ? Api.deletePortal(id) : this._localSaveAllDebounced());
      this.emit("change");
    },

    getPortal(id) {
      return this.state.portals.find((x) => x.id === id) || null;
    },

    /* ---------------- Ausschreibungen: CRUD ---------------- */

    addTender(data) {
      const now = new Date().toISOString();
      const tender = Object.assign({ id: Util.uid("tend"), createdAt: now, updatedAt: now }, data);
      this.state.tenders.push(tender);
      this._persist(() => this.backendMode ? Api.createTender(tender) : this._localSaveAllDebounced());
      this.emit("change");
      return tender;
    },

    updateTender(id, data) {
      const t = this.state.tenders.find((x) => x.id === id);
      if (!t) return null;
      Object.assign(t, data, { updatedAt: new Date().toISOString() });
      this._persist(() => this.backendMode ? Api.updateTender(id, t) : this._localSaveAllDebounced());
      this.emit("change");
      return t;
    },

    deleteTender(id) {
      this.state.tenders = this.state.tenders.filter((x) => x.id !== id);
      this._persist(() => this.backendMode ? Api.deleteTender(id) : this._localSaveAllDebounced());
      this.emit("change");
    },

    getTender(id) {
      return this.state.tenders.find((x) => x.id === id) || null;
    },

    /** Wandelt eine gewonnene Ausschreibung mit einem Klick in ein Projekt um. */
    convertTenderToProject(id) {
      const t = this.getTender(id);
      if (!t) return null;
      const palette = this.state.settings.colorPalette || Storage.DEFAULT_COLORS;
      const color = palette[this.state.projects.length % palette.length];
      const project = this.addProject({
        name: t.name,
        auftraggeber: t.auftraggeber,
        adresse: t.adresse,
        startYear: t.startYear,
        startWeek: t.startWeek,
        endYear: t.endYear,
        endWeek: t.endWeek,
        projektleiter: t.zustaendigIntern || "",
        obermonteur: "",
        besetzung: 2,
        status: "Geplant",
        farbe: color,
        bemerkungen: t.bemerkungen || "",
        notizen: "Aus Ausschreibung übernommen am " + Util.formatDateDE(new Date().toISOString()),
        tags: Array.isArray(t.gewerke) ? t.gewerke.slice() : []
      });
      this.updateTender(id, { angebotsstatus: "Auftrag erhalten", linkedProjectId: project.id });
      return project;
    },

    /** Debounced lokales Speichern (für addProject/updateProject usw. im Local-Storage-Modus). */
    _localSaveAllDebounced() {
      if (!this._debouncedLocalSaveAll) {
        this._debouncedLocalSaveAll = Util.debounce(() => this._localSaveAllNow(), 300);
      }
      this._debouncedLocalSaveAll();
    },

    /* ---------------- Ableitungen / Filter ---------------- */

    getVisibleProjects() {
      const f = this.state.ui.filters;
      const search = this.state.ui.search.trim().toLowerCase();
      return this.state.projects.filter((p) => {
        if (f.status && p.status !== f.status) return false;
        if (f.leiter && p.projektleiter !== f.leiter) return false;
        if (f.tag && !(Array.isArray(p.tags) && p.tags.includes(f.tag))) return false;
        if (search) {
          const hay = [p.name, p.auftraggeber, p.adresse, p.projektleiter, p.obermonteur, p.bemerkungen]
            .join(" ").toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      });
    },

    getVisibleTendersForPlanner() {
      if (!this.state.ui.filters.showTenderPreview) return [];
      return this.state.tenders.filter((t) => TENDER_PREVIEW_STATUSES.includes(t.angebotsstatus) && !t.linkedProjectId);
    },

    getFilteredTenders() {
      const f = this.state.ui.tenderFilters;
      const search = this.state.ui.search.trim().toLowerCase();
      let list = this.state.tenders.filter((t) => {
        if (f.status && t.angebotsstatus !== f.status) return false;
        if (f.zustaendig && t.zustaendigIntern !== f.zustaendig) return false;
        if (f.gewerk && !(Array.isArray(t.gewerke) && t.gewerke.includes(f.gewerk))) return false;
        if (search) {
          const hay = [t.name, t.auftraggeber, t.ansprechpartner, t.adresse, t.zustaendigIntern, t.bemerkungen]
            .join(" ").toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      });
      const { key, dir } = this.state.ui.tenderSort;
      list = list.slice().sort((a, b) => {
        let av, bv;
        if (key === "countdown") {
          av = this.tenderCountdownDays(a);
          bv = this.tenderCountdownDays(b);
          av = av === null ? Infinity : av;
          bv = bv === null ? Infinity : bv;
        } else {
          av = a[key]; bv = b[key];
          if (key === "auftragswert") { av = Number(av) || 0; bv = Number(bv) || 0; }
          if (av === undefined || av === null) av = "";
          if (bv === undefined || bv === null) bv = "";
        }
        if (av < bv) return dir === "asc" ? -1 : 1;
        if (av > bv) return dir === "asc" ? 1 : -1;
        return 0;
      });
      return list;
    },

    /* ---------------- Countdown bis Submission ---------------- */

    /** Ganzzahlige Tage bis zur Submission (negativ = überfällig), oder null ohne Datum. */
    tenderCountdownDays(tender) {
      if (!tender || !tender.submissionDatum) return null;
      const sub = new Date(tender.submissionDatum + "T00:00:00");
      if (isNaN(sub.getTime())) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Math.round((sub - today) / (24 * 3600 * 1000));
    },

    /** Einstufung für die farbliche Hervorhebung des Countdowns. */
    tenderCountdownLevel(tender) {
      const days = this.tenderCountdownDays(tender);
      if (days === null) return "none";
      if (days <= 0) return "critical";
      if (days <= 6) return "warn";
      if (days <= 14) return "notice";
      return "normal";
    },

    /** Überschneidung zweier {startYear,startWeek,endYear,endWeek} Zeiträume anhand Wochenindex. */
    rangesOverlap(a, b) {
      const spanA = this.getSpan(a);
      const spanB = this.getSpan(b);
      return spanA.startIdx <= spanB.endIdx && spanB.startIdx <= spanA.endIdx;
    },

    tenderOverlapsAnyProject(tender) {
      return this.state.projects.some((p) => p.status !== "Storniert" && this.rangesOverlap(p, tender));
    },

    /* ---------------- Kapazität ---------------- */

    computeCapacity() {
      const weeks = this.state.ui.weeks;
      const counts = new Array(weeks.length).fill(0);
      const staff = new Array(weeks.length).fill(0);

      this.state.projects.forEach((p) => {
        if (p.status === "Storniert") return;
        const { startIdx, endIdx } = this.getSpan(p);
        for (let i = startIdx; i <= endIdx; i++) {
          counts[i] += 1;
          staff[i] += Number(p.besetzung) || 0;
        }
      });

      let previewCounts = null, previewStaff = null;
      if (this.state.ui.filters.showTenderPreview) {
        previewCounts = counts.slice();
        previewStaff = staff.slice();
        this.getVisibleTendersForPlanner().forEach((t) => {
          const { startIdx, endIdx } = this.getSpan(t);
          for (let i = startIdx; i <= endIdx; i++) {
            previewCounts[i] += 1;
            previewStaff[i] += 2; // grobe Annahme für Vorschau-Besetzung
          }
        });
      }

      return { counts, staff, previewCounts, previewStaff };
    },

    capacityLevel(count) {
      const s = this.state.settings;
      if (count >= s.kritischProjekte) return "critical";
      if (count >= s.warnProjekte) return "warn";
      if (count > 0) return "ok";
      return "empty";
    },

    getCriticalWeeksSummary() {
      const { counts } = this.computeCapacity();
      const weeks = this.state.ui.weeks;
      const critical = [];
      counts.forEach((c, i) => {
        if (this.capacityLevel(c) === "critical") critical.push(weeks[i]);
      });
      return critical;
    }
  };

  global.App = App;
  global.TENDER_PREVIEW_STATUSES = TENDER_PREVIEW_STATUSES;
  global.ZOOM_COL_WIDTH = ZOOM_COL_WIDTH;
})(window);
