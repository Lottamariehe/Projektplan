/* =========================================================
   importwizard.js – Import-Assistent für Excel-Dateien.

   Ablauf:
   1) Datei auswählen (SheetJS liest Arbeitsblätter im Browser)
   2) Für jedes Arbeitsblatt automatisch erkennen, ob es
      Projekte / Ausschreibungen / Mitarbeiter / Vergabeportale
      enthält (per Blattname + Spaltenüberschriften)
   3) Spalten automatisch den Datenbankfeldern zuordnen
      (unscharfe Erkennung über Stichwortlisten)
   4) Vorschau + Fehler-/Warnhinweise anzeigen
   5) Modus wählen (neu / aktualisieren / ersetzen) und
      bestehende Datensätze per Name erkennen
   6) Import ausführen, Zusammenfassung anzeigen
   ========================================================= */

(function (global) {
  "use strict";

  const root = () => document.getElementById("modalRoot");
  let wizardState = null;

  /* ---------------- Feld-Definitionen mit Stichwörtern ---------------- */

  const FIELD_SPECS = {
    project: {
      label: "Projekte",
      fields: {
        name: ["bezeichnung", "projektname", "bauvorhaben", "name", "projekt"],
        auftraggeber: ["auftraggeber", "bauherr", "kunde"],
        adresse: ["adresse", "anschrift"],
        startDatum: ["anfangsdatum", "startdatum", "beginn", "start"],
        endDatum: ["enddatum", "ende", "fertigstellung"],
        projektleiter: ["projektleiter"],
        obermonteur: ["obermonteur"],
        besetzung: ["besetzung", "anzahl mitarbeiter", "mitarbeiterzahl"],
        status: ["status"],
        bemerkungen: ["bemerkung", "notiz"]
      },
      required: ["name"]
    },
    tender: {
      label: "Ausschreibungen",
      fields: {
        name: ["bauvorhaben", "bezeichnung", "ausschreibung", "name"],
        auftraggeber: ["auftraggeber", "bauherr", "ausschreibende stelle", "ag/"],
        ansprechpartner: ["ansprechpartner", "bearbeiter"],
        submissionDatum: ["submission datum", "submissionsdatum", "abgabetermin", "submission"],
        submissionUhrzeit: ["submission uhrzeit", "uhrzeit"],
        gewerk: ["gewerk"],
        startDatum: ["anfangsdatum", "beginn", "start"],
        endDatum: ["enddatum", "ende"],
        vergabeportal: ["vergabeportal", "portal"],
        status: ["status"],
        auftragswert: ["angebotssumme", "auftragswert", "summe"],
        bemerkungen: ["bemerkung"],
        unterlagenLink: ["portal adresse", "link", "internetadresse"]
      },
      required: ["name"]
    },
    employee: {
      label: "Mitarbeiter",
      fields: {
        vorname: ["vorname"],
        nachname: ["nachname"],
        name: ["name"],
        funktion: ["funktion", "rolle"],
        aktiv: ["aktiv"],
        bemerkungen: ["bemerkung"]
      },
      required: []
    },
    portal: {
      label: "Vergabeportale",
      fields: {
        name: ["name des portals", "portalname", "name"],
        url: ["online-seite", "internetadresse", "url", "adresse"],
        hinweis: ["abgabe", "hinweis"]
      },
      required: ["name"]
    }
  };

  const SHEET_TYPE_HINTS = {
    project: ["projekt"],
    tender: ["ausschreibung", "vergabe", "submission"],
    employee: ["mitarbeiter", "personal"],
    portal: ["portal", "vergabeportal"]
  };

  /* ---------------- Hilfsfunktionen ---------------- */

  function normalize(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function guessSheetType(sheetName, headerRow) {
    const n = normalize(sheetName);
    for (const type in SHEET_TYPE_HINTS) {
      if (SHEET_TYPE_HINTS[type].some((kw) => n.includes(kw))) return type;
    }
    // Fallback: über Spaltenüberschriften raten
    const headerText = normalize((headerRow || []).join(" "));
    let best = null, bestScore = 0;
    for (const type in FIELD_SPECS) {
      let score = 0;
      Object.values(FIELD_SPECS[type].fields).forEach((keywords) => {
        if (keywords.some((kw) => headerText.includes(kw))) score++;
      });
      if (score > bestScore) { bestScore = score; best = type; }
    }
    return bestScore >= 2 ? best : null;
  }

  /** Findet die wahrscheinlichste Kopfzeile (die Zeile mit den meisten erkannten Stichwort-Treffern). */
  function findHeaderRowIndex(rows, type) {
    const spec = FIELD_SPECS[type];
    const allKeywords = Object.values(spec.fields).flat();
    let bestIdx = 0, bestScore = -1;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const rowText = rows[i].map(normalize);
      let score = 0;
      rowText.forEach((cell) => { if (allKeywords.some((kw) => cell.includes(kw))) score++; });
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    return bestIdx;
  }

  /** Ordnet Spaltenindizes den Zielfeldern zu (jede Spalte höchstens einmal verwendet). */
  function mapColumns(headerRow, type) {
    const spec = FIELD_SPECS[type];
    const used = new Set();
    const mapping = {};
    Object.keys(spec.fields).forEach((field) => {
      const keywords = spec.fields[field];
      let foundIdx = -1;
      headerRow.forEach((h, idx) => {
        if (foundIdx !== -1 || used.has(idx)) return;
        const norm = normalize(h);
        if (norm && keywords.some((kw) => norm.includes(kw))) foundIdx = idx;
      });
      if (foundIdx !== -1) { mapping[field] = foundIdx; used.add(foundIdx); }
    });
    return mapping;
  }

  function cellToDate(val) {
    if (val instanceof Date) return val;
    if (typeof val === "number") {
      // Excel-Seriennummer (Tage seit 1899-12-30)
      const utc = Math.round((val - 25569) * 86400 * 1000);
      return new Date(utc);
    }
    if (typeof val === "string" && val.trim()) {
      const m = val.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
      if (m) {
        let year = parseInt(m[3], 10);
        if (year < 100) year += 2000;
        const d = new Date(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
        if (!isNaN(d.getTime())) return d;
      }
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
  }

  function dateToWeekInfo(date) {
    if (!date || isNaN(date.getTime())) return null;
    return Util.isoWeekInfo(date);
  }

  function splitName(raw) {
    const clean = String(raw || "").replace(/\s+/g, " ").trim();
    if (!clean) return { vorname: "", nachname: "" };
    if (clean.includes(",")) {
      const [nach, rest] = clean.split(",");
      return { vorname: (rest || "").trim().split(" ")[0] || "", nachname: nach.trim() };
    }
    const parts = clean.split(" ");
    if (parts.length === 1) return { vorname: "", nachname: parts[0] };
    return { vorname: parts[0], nachname: parts.slice(1).join(" ") };
  }

  function mapGewerkeText(text) {
    const t = normalize(text);
    const tags = new Set();
    if (!t) return [];
    if (t.includes("heiz") || t.includes("pellet") || t.includes("wärme") || t.includes("waerme")) tags.add("Heizung");
    if (t.includes("sanit")) tags.add("Sanitär");
    if (t.includes("lüft") || t.includes("luft")) tags.add("Lüftung");
    if (t.includes("hls")) { tags.add("Heizung"); tags.add("Sanitär"); tags.add("Lüftung"); }
    if (t.includes("strangsanierung")) tags.add("Strangsanierung");
    if (!tags.size) tags.add("Sonstige");
    return Array.from(tags);
  }

  function findPortalIdByName(name) {
    const n = normalize(name);
    if (!n) return null;
    const match = App.state.portals.find((p) => normalize(p.name) === n || n.includes(normalize(p.name)) || normalize(p.name).includes(n));
    return match ? match.id : null;
  }

  /* ---------------- Zeilen in Datensätze umwandeln ---------------- */

  function buildRecords(type, rows, mapping) {
    const errors = [];
    const records = [];
    const today = new Date();

    rows.forEach((row, rowIdx) => {
      if (!row || row.every((c) => c === undefined || c === null || String(c).trim() === "")) return;
      const get = (field) => (mapping[field] !== undefined ? row[mapping[field]] : undefined);
      const rowErrors = [];
      let record = { _rowIndex: rowIdx };

      if (type === "project" || type === "tender") {
        const name = String(get("name") || "").trim();
        if (!name) { rowErrors.push("Name/Bezeichnung fehlt – Zeile übersprungen."); errors.push({ row: rowIdx + 1, messages: rowErrors }); return; }
        record.name = name;
        record.auftraggeber = String(get("auftraggeber") || "").trim();
        record.bemerkungen = String(get("bemerkungen") || "").trim();

        const startDate = cellToDate(get("startDatum"));
        const startInfo = dateToWeekInfo(startDate);
        let endDate = cellToDate(get("endDatum"));
        let endInfo = dateToWeekInfo(endDate);

        if (!startInfo) {
          rowErrors.push("Keine gültige Start-Kalenderwoche gefunden – heutige Woche als Standard verwendet.");
        }
        const effectiveStart = startInfo || Util.isoWeekInfo(today);
        if (!endInfo) {
          const fallbackEnd = Util.addDays(startDate || today, 60);
          endInfo = Util.isoWeekInfo(fallbackEnd);
          rowErrors.push("Keine gültige End-Kalenderwoche gefunden – Standardzeitraum (+60 Tage) verwendet.");
        }
        record.startYear = effectiveStart.year;
        record.startWeek = effectiveStart.week;
        record.endYear = endInfo.year;
        record.endWeek = endInfo.week;

        if (type === "project") {
          record.adresse = String(get("adresse") || "").trim();
          record.projektleiter = String(get("projektleiter") || "").trim();
          record.obermonteur = String(get("obermonteur") || "").trim();
          record.besetzung = parseInt(get("besetzung"), 10) || 0;
          record.status = String(get("status") || "").trim() || "Geplant";
          record.farbe = (App.state.settings.colorPalette || Storage.DEFAULT_COLORS)[rowIdx % (App.state.settings.colorPalette || Storage.DEFAULT_COLORS).length];
          record.tags = mapGewerkeText(record.name).length ? mapGewerkeText(record.name) : [];
          record.notizen = "";
        } else {
          const subDate = cellToDate(get("submissionDatum"));
          record.submissionDatum = subDate ? subDate.toISOString().slice(0, 10) : "";
          record.submissionUhrzeit = String(get("submissionUhrzeit") || "").trim();
          record.angebotsstatus = String(get("status") || "").trim() || "In Bearbeitung";
          const wert = parseFloat(String(get("auftragswert") || "").replace(/[^\d.,-]/g, "").replace(",", "."));
          record.auftragswert = isNaN(wert) ? null : wert;
          record.zustaendigIntern = String(get("ansprechpartner") || "").trim();
          record.ansprechpartner = record.zustaendigIntern;
          record.unterlagenLink = String(get("unterlagenLink") || "").trim();
          record.gewerke = mapGewerkeText(get("gewerk"));
          record.portalId = findPortalIdByName(get("vergabeportal"));
          if (get("vergabeportal") && !record.portalId) {
            rowErrors.push(`Vergabeportal „${get("vergabeportal")}“ nicht gefunden – wird ohne Portal importiert.`);
          }
        }
      } else if (type === "employee") {
        let vorname = String(get("vorname") || "").trim();
        let nachname = String(get("nachname") || "").trim();
        if (!vorname && !nachname && get("name")) {
          const split = splitName(get("name"));
          vorname = split.vorname; nachname = split.nachname;
        }
        if (!vorname && !nachname) { return; }
        record.vorname = vorname;
        record.nachname = nachname;
        record.funktion = String(get("funktion") || "").trim();
        record.aktiv = normalize(get("aktiv")) === "nein" || normalize(get("aktiv")) === "false" ? false : true;
        record.bemerkungen = String(get("bemerkungen") || "").trim();
      } else if (type === "portal") {
        const name = String(get("name") || "").trim();
        if (!name) return;
        record.name = name;
        record.url = String(get("url") || "").trim();
        record.hinweis = String(get("hinweis") || "").trim();
      }

      if (rowErrors.length) errors.push({ row: rowIdx + 1, messages: rowErrors });
      records.push(record);
    });

    return { records, errors };
  }

  /* ---------------- Abgleich mit vorhandenen Daten ---------------- */

  function matchExisting(type, record) {
    if (type === "project") {
      return App.state.projects.find((p) => normalize(p.name) === normalize(record.name));
    }
    if (type === "tender") {
      return App.state.tenders.find((t) => normalize(t.name) === normalize(record.name));
    }
    if (type === "employee") {
      return App.state.employees.find((e) => normalize(e.vorname + " " + e.nachname) === normalize(record.vorname + " " + record.nachname));
    }
    if (type === "portal") {
      return App.state.portals.find((p) => normalize(p.name) === normalize(record.name));
    }
    return null;
  }

  function finalizeRecords(type, records) {
    return records.map((r) => {
      const existing = matchExisting(type, r);
      const id = existing ? existing.id : Util.uid(type === "project" ? "proj" : type === "tender" ? "tend" : type === "employee" ? "emp" : "portal");
      return Object.assign({}, r, { id, _isNew: !existing });
    });
  }

  /* ---------------- UI ---------------- */

  function close() {
    root().innerHTML = "";
  }

  function openWizard() {
    wizardState = { file: null, sheets: [], mode: "add" };
    renderStep1();
  }

  function openOverlay(innerHtml) {
    root().innerHTML = `<div class="modal-overlay" id="modalOverlay"><div class="modal-box wide import-wizard">${innerHtml}</div></div>`;
  }

  function renderStep1() {
    openOverlay(`
      <div class="modal-header">
        <h2>Daten importieren</h2>
        <button class="modal-close" id="wClose">&times;</button>
      </div>
      <p class="settings-hint">
        Wähle eine Excel-Datei mit Projekten, Ausschreibungen, Mitarbeitern und/oder Vergabeportalen.
        Die Spalten werden automatisch erkannt und zugeordnet.
      </p>
      <input type="file" id="wFile" accept=".xlsx,.xls,.csv">
      <div class="modal-footer">
        <div class="left"><span></span></div>
        <div class="right"><button class="btn btn-ghost" id="wCancel">Abbrechen</button></div>
      </div>
    `);
    document.getElementById("wClose").addEventListener("click", close);
    document.getElementById("wCancel").addEventListener("click", close);
    document.getElementById("wFile").addEventListener("change", onFileSelected);
  }

  function onFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        processWorkbook(wb);
      } catch (err) {
        Toast.show("Datei konnte nicht gelesen werden: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function processWorkbook(wb) {
    const sheets = [];
    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
      if (!rows.length) return;

      const roughHeader = rows[0].map(String);
      let type = guessSheetType(sheetName, roughHeader);
      if (!type) return; // Unbekanntes Blatt -> überspringen

      const headerIdx = findHeaderRowIndex(rows, type);
      const headerRow = rows[headerIdx];
      const dataRows = rows.slice(headerIdx + 1);
      const mapping = mapColumns(headerRow, type);
      const { records, errors } = buildRecords(type, dataRows, mapping);
      const finalRecords = finalizeRecords(type, records);

      sheets.push({ sheetName, type, headerRow, mapping, records: finalRecords, errors });
    });

    if (!sheets.length) {
      Toast.show("Keine erkennbaren Arbeitsblätter gefunden (Projekte/Ausschreibungen/Mitarbeiter/Vergabeportale).");
      return;
    }

    wizardState.sheets = sheets;
    renderStep2();
  }

  function renderStep2() {
    const s = wizardState.sheets;
    const totalErrors = s.reduce((sum, sh) => sum + sh.errors.length, 0);
    const newCount = (type) => s.filter((sh) => sh.type === type).reduce((n, sh) => n + sh.records.filter((r) => r._isNew).length, 0);
    const updCount = (type) => s.filter((sh) => sh.type === type).reduce((n, sh) => n + sh.records.filter((r) => !r._isNew).length, 0);

    const summaryRows = ["project", "tender", "employee", "portal"]
      .filter((type) => s.some((sh) => sh.type === type))
      .map((type) => `<tr><td>${FIELD_SPECS[type].label}</td><td>${newCount(type)}</td><td>${updCount(type)}</td></tr>`)
      .join("");

    const previewHtml = s.map((sh) => `
      <div class="import-sheet-preview">
        <h4>${Util.escapeHtml(sh.sheetName)} → erkannt als: ${FIELD_SPECS[sh.type].label}</h4>
        <table class="data-table" style="min-width:0;">
          <thead><tr>${Object.keys(sh.mapping).map((f) => `<th>${f}</th>`).join("")}</tr></thead>
          <tbody>
            ${sh.records.slice(0, 4).map((r) => `<tr>${Object.keys(sh.mapping).map((f) => `<td>${Util.escapeHtml(String(r[f] !== undefined ? r[f] : ""))}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
        ${sh.records.length > 4 ? `<p class="settings-hint">… und ${sh.records.length - 4} weitere Zeile(n).</p>` : ""}
        ${sh.errors.length ? `<div class="import-errors"><strong>${sh.errors.length} Hinweis(e):</strong><ul>${sh.errors.slice(0, 6).map((e) => `<li>Zeile ${e.row}: ${e.messages.join(" ")}</li>`).join("")}</ul></div>` : ""}
      </div>
    `).join("");

    openOverlay(`
      <div class="modal-header">
        <h2>Vorschau &amp; Zuordnung</h2>
        <button class="modal-close" id="wClose">&times;</button>
      </div>
      <table class="data-table" style="min-width:0; margin-bottom:14px;">
        <thead><tr><th>Bereich</th><th>Neu</th><th>Aktualisiert</th></tr></thead>
        <tbody>${summaryRows}</tbody>
      </table>
      ${totalErrors ? `<p class="settings-hint" style="color:var(--color-warning);">${totalErrors} Hinweis(e)/Warnung(en) gefunden – Details je Blatt unten.</p>` : ""}
      <div class="import-preview-scroll">${previewHtml}</div>

      <div class="form-row" style="margin-top:14px;">
        <label>Importmodus</label>
        <select id="wMode">
          <option value="add">Nur neue Datensätze hinzufügen</option>
          <option value="update" selected>Neue hinzufügen &amp; vorhandene aktualisieren</option>
          ${App.isAdmin ? `<option value="replace">Gesamten Datenbestand ersetzen (Administrator)</option>` : ""}
        </select>
      </div>

      <div class="modal-footer">
        <div class="left"><button class="btn btn-ghost" id="wBack">Zurück</button></div>
        <div class="right">
          <button class="btn btn-ghost" id="wCancel">Abbrechen</button>
          <button class="btn btn-primary" id="wConfirm">Import starten</button>
        </div>
      </div>
    `);

    document.getElementById("wClose").addEventListener("click", close);
    document.getElementById("wCancel").addEventListener("click", close);
    document.getElementById("wBack").addEventListener("click", renderStep1);
    document.getElementById("wConfirm").addEventListener("click", runImport);
  }

  async function runImport() {
    const mode = document.getElementById("wMode").value;
    const payload = { mode, projects: [], tenders: [], employees: [], portals: [] };

    wizardState.sheets.forEach((sh) => {
      const key = sh.type === "project" ? "projects" : sh.type === "tender" ? "tenders" : sh.type === "employee" ? "employees" : "portals";
      sh.records.forEach((r) => {
        const clean = Object.assign({}, r);
        delete clean._rowIndex;
        delete clean._isNew;
        payload[key].push(clean);
      });
    });

    openOverlay(`
      <div class="modal-header"><h2>Import läuft …</h2></div>
      <p class="settings-hint">Bitte warten, die Daten werden gespeichert.</p>
    `);

    try {
      let result;
      if (App.backendMode) {
        result = await Api.runImport(payload);
      } else {
        result = applyImportLocally(payload);
      }
      await App.init();
      App.emit("change");
      renderSummary(result.summary);
    } catch (err) {
      Toast.show("Import fehlgeschlagen: " + err.message);
      close();
    }
  }

  /** Fallback, wenn kein Backend erreichbar ist (Local-Storage-Modus). */
  function applyImportLocally(payload) {
    const summary = {
      projects: { created: 0, updated: 0 },
      tenders: { created: 0, updated: 0 },
      employees: { created: 0, updated: 0 },
      portals: { created: 0, updated: 0 }
    };

    if (payload.mode === "replace") {
      App.state.projects = []; App.state.tenders = [];
      App.state.employees = []; App.state.portals = [];
    }

    function upsert(list, rec, summaryKey) {
      const idx = list.findIndex((x) => x.id === rec.id);
      if (idx === -1) { list.push(rec); summary[summaryKey].created++; }
      else { Object.assign(list[idx], rec); summary[summaryKey].updated++; }
    }

    payload.portals.forEach((p) => upsert(App.state.portals, p, "portals"));
    payload.employees.forEach((e) => upsert(App.state.employees, e, "employees"));
    payload.projects.forEach((p) => upsert(App.state.projects, p, "projects"));
    payload.tenders.forEach((t) => upsert(App.state.tenders, t, "tenders"));

    App._localSaveAllNow();
    return { summary };
  }

  function renderSummary(summary) {
    const lines = Object.keys(summary).map((key) => {
      const label = { projects: "Projekte", tenders: "Ausschreibungen", employees: "Mitarbeiter", portals: "Vergabeportale" }[key];
      const s = summary[key];
      return `<li>${label}: ${s.created} neu, ${s.updated} aktualisiert${s.skipped ? `, ${s.skipped} übersprungen` : ""}</li>`;
    }).join("");

    openOverlay(`
      <div class="modal-header">
        <h2>Import abgeschlossen</h2>
        <button class="modal-close" id="wClose">&times;</button>
      </div>
      <ul>${lines}</ul>
      <div class="modal-footer">
        <div class="left"><span></span></div>
        <div class="right"><button class="btn btn-primary" id="wDone">Fertig</button></div>
      </div>
    `);
    document.getElementById("wClose").addEventListener("click", close);
    document.getElementById("wDone").addEventListener("click", close);
  }

  global.ImportWizard = { open: openWizard };
})(window);
