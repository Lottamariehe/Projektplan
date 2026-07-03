/* =========================================================
   modals.js – Formulare zum Anlegen/Bearbeiten von
   Projekten und Ausschreibungen.
   ========================================================= */

(function (global) {
  "use strict";

  const root = () => document.getElementById("modalRoot");

  function close() {
    root().innerHTML = "";
    document.removeEventListener("keydown", onEscape);
  }

  function onEscape(e) {
    if (e.key === "Escape") close();
  }

  function openOverlay(innerHtml, widthClass) {
    root().innerHTML = `<div class="modal-overlay" id="modalOverlay">
      <div class="modal-box ${widthClass || ""}">${innerHtml}</div>
    </div>`;
    document.getElementById("modalOverlay").addEventListener("mousedown", (e) => {
      if (e.target.id === "modalOverlay") close();
    });
    document.addEventListener("keydown", onEscape);
  }

  function weekPreview(year, week) {
    if (!year || !week) return "";
    try {
      const monday = Util.mondayOfISOWeek(Number(year), Number(week));
      const sunday = Util.addDays(monday, 6);
      return monday.toLocaleDateString("de-DE") + " – " + sunday.toLocaleDateString("de-DE");
    } catch (e) {
      return "";
    }
  }

  function datalistOptions(id, values) {
    return `<datalist id="${id}">${(values || []).map((v) => `<option value="${Util.escapeHtml(v)}">`).join("")}</datalist>`;
  }

  function selectOptions(values, selected) {
    return values.map((v) => `<option value="${Util.escapeHtml(v)}" ${v === selected ? "selected" : ""}>${Util.escapeHtml(v)}</option>`).join("");
  }

  /* ==================== PROJEKT ==================== */

  function openProjectModal(id) {
    const editing = !!id;
    const p = editing ? App.getProject(id) : {
      name: "", auftraggeber: "", adresse: "",
      startYear: App.state.ui.weeks.find((w) => w.isToday)?.year || new Date().getFullYear(),
      startWeek: App.state.ui.weeks.find((w) => w.isToday)?.week || 1,
      endYear: App.state.ui.weeks.find((w) => w.isToday)?.year || new Date().getFullYear(),
      endWeek: (App.state.ui.weeks.find((w) => w.isToday)?.week || 1) + 1,
      projektleiter: "", obermonteur: "", besetzung: 2,
      status: "Geplant", farbe: (App.state.settings.colorPalette || Storage.DEFAULT_COLORS)[0],
      bemerkungen: "", notizen: ""
    };

    const palette = App.state.settings.colorPalette || Storage.DEFAULT_COLORS;

    const html = `
      <div class="modal-header">
        <h2>${editing ? "Projekt bearbeiten" : "Neues Projekt"}</h2>
        <button class="modal-close" id="mClose">&times;</button>
      </div>
      <div class="modal-grid">
        <div class="form-row span-2">
          <label>Projektname *</label>
          <input type="text" id="fName" value="${Util.escapeHtml(p.name)}" placeholder="z. B. Heizungssanierung Musterstraße">
        </div>
        <div class="form-row">
          <label>Auftraggeber</label>
          <input type="text" id="fAuftraggeber" value="${Util.escapeHtml(p.auftraggeber)}">
        </div>
        <div class="form-row">
          <label>Projektadresse</label>
          <input type="text" id="fAdresse" value="${Util.escapeHtml(p.adresse)}">
        </div>

        <div class="form-row">
          <label>Start-KW / Jahr *</label>
          <div style="display:flex; gap:6px;">
            <input type="number" id="fStartWeek" min="1" max="53" value="${p.startWeek}" style="width:70px;">
            <input type="number" id="fStartYear" min="2020" max="2100" value="${p.startYear}" style="width:90px;">
          </div>
          <div class="settings-hint" id="fStartPreview">${weekPreview(p.startYear, p.startWeek)}</div>
        </div>
        <div class="form-row">
          <label>End-KW / Jahr *</label>
          <div style="display:flex; gap:6px;">
            <input type="number" id="fEndWeek" min="1" max="53" value="${p.endWeek}" style="width:70px;">
            <input type="number" id="fEndYear" min="2020" max="2100" value="${p.endYear}" style="width:90px;">
          </div>
          <div class="settings-hint" id="fEndPreview">${weekPreview(p.endYear, p.endWeek)}</div>
        </div>

        <div class="form-row">
          <label>Projektleiter</label>
          <input type="text" id="fLeiter" list="dlLeiter" value="${Util.escapeHtml(p.projektleiter)}">
          ${datalistOptions("dlLeiter", App.state.settings.projektleiter)}
        </div>
        <div class="form-row">
          <label>Obermonteur</label>
          <input type="text" id="fOber" list="dlOber" value="${Util.escapeHtml(p.obermonteur)}">
          ${datalistOptions("dlOber", App.state.settings.obermonteure)}
        </div>

        <div class="form-row">
          <label>Geplante Besetzung (Mitarbeitende)</label>
          <input type="number" id="fBesetzung" min="0" value="${p.besetzung}">
        </div>
        <div class="form-row">
          <label>Status</label>
          <select id="fStatus">${selectOptions(Storage.PROJECT_STATUS, p.status)}</select>
        </div>

        <div class="form-row span-2">
          <label>Farbe</label>
          <div class="color-palette" id="fColorPalette">
            ${palette.map((c) => `<div class="color-swatch" data-color="${c}" style="background:${c}; border-color:${c === p.farbe ? "#1f2430" : "transparent"};"></div>`).join("")}
          </div>
          <input type="hidden" id="fFarbe" value="${p.farbe}">
        </div>

        <div class="form-row span-2">
          <label>Bemerkungen</label>
          <textarea id="fBemerkungen" rows="2">${Util.escapeHtml(p.bemerkungen)}</textarea>
        </div>
        <div class="form-row span-2">
          <label>Notizen</label>
          <textarea id="fNotizen" rows="2">${Util.escapeHtml(p.notizen)}</textarea>
        </div>
        <div class="field-error span-2" id="fError" style="display:none;"></div>
      </div>
      <div class="modal-footer">
        <div class="left">
          ${editing ? `<button class="btn btn-ghost danger" id="mDelete">Projekt löschen</button>` : "<span></span>"}
        </div>
        <div class="right">
          <button class="btn btn-ghost" id="mCancel">Abbrechen</button>
          <button class="btn btn-primary" id="mSave">Speichern</button>
        </div>
      </div>`;

    openOverlay(html, "");

    document.getElementById("mClose").addEventListener("click", close);
    document.getElementById("mCancel").addEventListener("click", close);

    document.querySelectorAll("#fColorPalette .color-swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        document.getElementById("fFarbe").value = sw.dataset.color;
        document.querySelectorAll("#fColorPalette .color-swatch").forEach((s) => s.style.borderColor = "transparent");
        sw.style.borderColor = "#1f2430";
      });
    });

    ["fStartWeek", "fStartYear"].forEach((idAttr) => {
      document.getElementById(idAttr).addEventListener("input", () => {
        document.getElementById("fStartPreview").textContent = weekPreview(
          document.getElementById("fStartYear").value, document.getElementById("fStartWeek").value
        );
      });
    });
    ["fEndWeek", "fEndYear"].forEach((idAttr) => {
      document.getElementById(idAttr).addEventListener("input", () => {
        document.getElementById("fEndPreview").textContent = weekPreview(
          document.getElementById("fEndYear").value, document.getElementById("fEndWeek").value
        );
      });
    });

    if (editing) {
      document.getElementById("mDelete").addEventListener("click", () => {
        if (confirm(`Projekt „${p.name}“ wirklich löschen?`)) {
          App.deleteProject(id);
          Toast.show("Projekt gelöscht.");
          close();
        }
      });
    }

    document.getElementById("mSave").addEventListener("click", () => {
      const data = {
        name: document.getElementById("fName").value.trim(),
        auftraggeber: document.getElementById("fAuftraggeber").value.trim(),
        adresse: document.getElementById("fAdresse").value.trim(),
        startWeek: parseInt(document.getElementById("fStartWeek").value, 10),
        startYear: parseInt(document.getElementById("fStartYear").value, 10),
        endWeek: parseInt(document.getElementById("fEndWeek").value, 10),
        endYear: parseInt(document.getElementById("fEndYear").value, 10),
        projektleiter: document.getElementById("fLeiter").value.trim(),
        obermonteur: document.getElementById("fOber").value.trim(),
        besetzung: parseInt(document.getElementById("fBesetzung").value, 10) || 0,
        status: document.getElementById("fStatus").value,
        farbe: document.getElementById("fFarbe").value,
        bemerkungen: document.getElementById("fBemerkungen").value.trim(),
        notizen: document.getElementById("fNotizen").value.trim()
      };

      const err = validateRange(data);
      if (!data.name) {
        showError("Bitte einen Projektnamen angeben.");
        return;
      }
      if (err) { showError(err); return; }

      if (editing) App.updateProject(id, data);
      else App.addProject(data);

      Toast.show(editing ? "Projekt aktualisiert." : "Projekt angelegt.");
      close();
    });

    function showError(msg) {
      const el = document.getElementById("fError");
      el.textContent = msg;
      el.style.display = "block";
    }
  }

  function validateRange(data) {
    if (!data.startWeek || !data.startYear || !data.endWeek || !data.endYear) {
      return "Bitte Start- und End-Kalenderwoche vollständig angeben.";
    }
    if (Util.compareWeeks({ year: data.startYear, week: data.startWeek }, { year: data.endYear, week: data.endWeek }) > 0) {
      return "Die End-Kalenderwoche darf nicht vor der Start-Kalenderwoche liegen.";
    }
    return null;
  }

  /* ==================== AUSSCHREIBUNG ==================== */

  function openTenderModal(id) {
    const editing = !!id;
    const t = editing ? App.getTender(id) : {
      name: "", auftraggeber: "", ansprechpartner: "", adresse: "",
      submissionDatum: "", submissionUhrzeit: "",
      startYear: App.state.ui.weeks.find((w) => w.isToday)?.year || new Date().getFullYear(),
      startWeek: App.state.ui.weeks.find((w) => w.isToday)?.week || 1,
      endYear: App.state.ui.weeks.find((w) => w.isToday)?.year || new Date().getFullYear(),
      endWeek: (App.state.ui.weeks.find((w) => w.isToday)?.week || 1) + 1,
      angebotsstatus: "In Bearbeitung", auftragswert: "", zustaendigIntern: "",
      bearbeitungsfrist: "", bemerkungen: "", unterlagenLink: ""
    };

    const people = Array.from(new Set([...(App.state.settings.projektleiter || []), ...(App.state.settings.obermonteure || [])]));

    const html = `
      <div class="modal-header">
        <h2>${editing ? "Ausschreibung bearbeiten" : "Neue Ausschreibung"}</h2>
        <button class="modal-close" id="mClose">&times;</button>
      </div>
      <div class="modal-grid">
        <div class="form-row span-2">
          <label>Ausschreibungsname / Bauvorhaben *</label>
          <input type="text" id="fName" value="${Util.escapeHtml(t.name)}">
        </div>
        <div class="form-row">
          <label>Auftraggeber / ausschreibende Stelle</label>
          <input type="text" id="fAuftraggeber" value="${Util.escapeHtml(t.auftraggeber)}">
        </div>
        <div class="form-row">
          <label>Ansprechpartner</label>
          <input type="text" id="fAnsprechpartner" value="${Util.escapeHtml(t.ansprechpartner)}">
        </div>
        <div class="form-row span-2">
          <label>Projektadresse</label>
          <input type="text" id="fAdresse" value="${Util.escapeHtml(t.adresse)}">
        </div>

        <div class="form-row">
          <label>Submissionstermin</label>
          <input type="date" id="fSubmissionDatum" value="${t.submissionDatum || ""}">
        </div>
        <div class="form-row">
          <label>Uhrzeit der Submission</label>
          <input type="time" id="fSubmissionUhrzeit" value="${t.submissionUhrzeit || ""}">
        </div>

        <div class="form-row">
          <label>Start-KW / Jahr (geplanter Ausführungszeitraum) *</label>
          <div style="display:flex; gap:6px;">
            <input type="number" id="fStartWeek" min="1" max="53" value="${t.startWeek}" style="width:70px;">
            <input type="number" id="fStartYear" min="2020" max="2100" value="${t.startYear}" style="width:90px;">
          </div>
          <div class="settings-hint" id="fStartPreview">${weekPreview(t.startYear, t.startWeek)}</div>
        </div>
        <div class="form-row">
          <label>End-KW / Jahr *</label>
          <div style="display:flex; gap:6px;">
            <input type="number" id="fEndWeek" min="1" max="53" value="${t.endWeek}" style="width:70px;">
            <input type="number" id="fEndYear" min="2020" max="2100" value="${t.endYear}" style="width:90px;">
          </div>
          <div class="settings-hint" id="fEndPreview">${weekPreview(t.endYear, t.endWeek)}</div>
        </div>

        <div class="form-row">
          <label>Angebotsstatus</label>
          <select id="fStatus">${selectOptions(Storage.TENDER_STATUS, t.angebotsstatus)}</select>
        </div>
        <div class="form-row">
          <label>Geschätzter Auftragswert (EUR)</label>
          <input type="number" id="fWert" min="0" value="${t.auftragswert}">
        </div>

        <div class="form-row">
          <label>Zuständige Person intern</label>
          <input type="text" id="fZustaendig" list="dlPeople" value="${Util.escapeHtml(t.zustaendigIntern)}">
          ${datalistOptions("dlPeople", people)}
        </div>
        <div class="form-row">
          <label>Bearbeitungsfrist</label>
          <input type="date" id="fFrist" value="${t.bearbeitungsfrist || ""}">
        </div>

        <div class="form-row span-2">
          <label>Link / Ablageort Ausschreibungsunterlagen</label>
          <input type="text" id="fLink" value="${Util.escapeHtml(t.unterlagenLink)}" placeholder="URL oder Serverpfad">
        </div>
        <div class="form-row span-2">
          <label>Bemerkungen</label>
          <textarea id="fBemerkungen" rows="2">${Util.escapeHtml(t.bemerkungen)}</textarea>
        </div>
        <div class="field-error span-2" id="fError" style="display:none;"></div>
      </div>
      <div class="modal-footer">
        <div class="left" style="display:flex; gap:8px;">
          ${editing ? `<button class="btn btn-ghost danger" id="mDelete">Löschen</button>` : "<span></span>"}
          ${editing && t.angebotsstatus === "Auftrag erhalten" && !t.linkedProjectId ? `<button class="btn btn-ghost" id="mConvert" style="color:var(--color-success); border-color:var(--color-success);">In Projekt umwandeln</button>` : ""}
        </div>
        <div class="right">
          <button class="btn btn-ghost" id="mCancel">Abbrechen</button>
          <button class="btn btn-primary" id="mSave">Speichern</button>
        </div>
      </div>`;

    openOverlay(html, "wide");

    document.getElementById("mClose").addEventListener("click", close);
    document.getElementById("mCancel").addEventListener("click", close);

    ["fStartWeek", "fStartYear"].forEach((idAttr) => {
      document.getElementById(idAttr).addEventListener("input", () => {
        document.getElementById("fStartPreview").textContent = weekPreview(
          document.getElementById("fStartYear").value, document.getElementById("fStartWeek").value
        );
      });
    });
    ["fEndWeek", "fEndYear"].forEach((idAttr) => {
      document.getElementById(idAttr).addEventListener("input", () => {
        document.getElementById("fEndPreview").textContent = weekPreview(
          document.getElementById("fEndYear").value, document.getElementById("fEndWeek").value
        );
      });
    });

    if (editing) {
      document.getElementById("mDelete").addEventListener("click", () => {
        if (confirm(`Ausschreibung „${t.name}“ wirklich löschen?`)) {
          App.deleteTender(id);
          Toast.show("Ausschreibung gelöscht.");
          close();
        }
      });
      const convertBtn = document.getElementById("mConvert");
      if (convertBtn) {
        convertBtn.addEventListener("click", () => {
          const project = App.convertTenderToProject(id);
          if (project) Toast.show(`In Projekt „${project.name}“ umgewandelt.`);
          close();
        });
      }
    }

    document.getElementById("mSave").addEventListener("click", () => {
      const data = {
        name: document.getElementById("fName").value.trim(),
        auftraggeber: document.getElementById("fAuftraggeber").value.trim(),
        ansprechpartner: document.getElementById("fAnsprechpartner").value.trim(),
        adresse: document.getElementById("fAdresse").value.trim(),
        submissionDatum: document.getElementById("fSubmissionDatum").value,
        submissionUhrzeit: document.getElementById("fSubmissionUhrzeit").value,
        startWeek: parseInt(document.getElementById("fStartWeek").value, 10),
        startYear: parseInt(document.getElementById("fStartYear").value, 10),
        endWeek: parseInt(document.getElementById("fEndWeek").value, 10),
        endYear: parseInt(document.getElementById("fEndYear").value, 10),
        angebotsstatus: document.getElementById("fStatus").value,
        auftragswert: document.getElementById("fWert").value,
        zustaendigIntern: document.getElementById("fZustaendig").value.trim(),
        bearbeitungsfrist: document.getElementById("fFrist").value,
        unterlagenLink: document.getElementById("fLink").value.trim(),
        bemerkungen: document.getElementById("fBemerkungen").value.trim()
      };

      if (!data.name) { showError("Bitte einen Namen für die Ausschreibung angeben."); return; }
      const err = validateRange(data);
      if (err) { showError(err); return; }

      if (editing) App.updateTender(id, data);
      else App.addTender(data);

      Toast.show(editing ? "Ausschreibung aktualisiert." : "Ausschreibung angelegt.");
      close();
    });

    function showError(msg) {
      const el = document.getElementById("fError");
      el.textContent = msg;
      el.style.display = "block";
    }
  }

  global.Modals = { openProjectModal, openTenderModal, close };
})(window);
