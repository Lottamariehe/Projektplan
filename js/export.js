/* =========================================================
   export.js – CSV-Export (Excel-kompatibel) für Projekte
   und Ausschreibungen. PDF-Export erfolgt über den
   Browser-Druckdialog (window.print) mit eigenem Druck-CSS.
   ========================================================= */

(function (global) {
  "use strict";

  function csvEscape(value) {
    const s = value === null || value === undefined ? "" : String(value);
    if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCSV(rows) {
    return rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");
  }

  function download(filename, content) {
    const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportProjects() {
    const header = [
      "Projektname", "Auftraggeber", "Projektadresse", "Start-KW", "Start-Jahr",
      "End-KW", "End-Jahr", "Projektleiter", "Obermonteur", "Besetzung",
      "Status", "Tags", "Mitarbeiter", "Bemerkungen", "Notizen"
    ];
    const rows = App.getVisibleProjects().map((p) => [
      p.name, p.auftraggeber, p.adresse, p.startWeek, p.startYear,
      p.endWeek, p.endYear, p.projektleiter, p.obermonteur, p.besetzung,
      p.status, (p.tags || []).join(", "), App.employeeNames(p.employeeIds).join(", "),
      p.bemerkungen, p.notizen
    ]);
    download("projektuebersicht.csv", toCSV([header, ...rows]));
    Toast.show("Projektübersicht als CSV exportiert (in Excel öffnen).");
  }

  function exportTenders() {
    const header = [
      "Ausschreibung / Bauvorhaben", "Auftraggeber", "Ansprechpartner", "Projektadresse",
      "Vergabeportal", "Gewerke", "Submissionstermin", "Uhrzeit", "Countdown (Tage)",
      "Start-KW", "Start-Jahr", "End-KW", "End-Jahr",
      "Angebotsstatus", "Geschätzter Auftragswert", "Zuständig intern", "Bearbeitungsfrist",
      "Bemerkungen", "Unterlagen-Link"
    ];
    const rows = App.getFilteredTenders().map((t) => {
      const portal = t.portalId ? App.getPortal(t.portalId) : null;
      return [
        t.name, t.auftraggeber, t.ansprechpartner, t.adresse,
        portal ? portal.name : "", (t.gewerke || []).join(", "),
        t.submissionDatum, t.submissionUhrzeit, App.tenderCountdownDays(t),
        t.startWeek, t.startYear, t.endWeek, t.endYear,
        t.angebotsstatus, t.auftragswert, t.zustaendigIntern, t.bearbeitungsfrist,
        t.bemerkungen, t.unterlagenLink
      ];
    });
    download("ausschreibungsuebersicht.csv", toCSV([header, ...rows]));
    Toast.show("Ausschreibungsübersicht als CSV exportiert (in Excel öffnen).");
  }

  /** Echter Excel-Export (.xlsx) der Personaleinsatzplanung – nutzt die
   *  ohnehin für den Import-Assistenten geladene SheetJS-Bibliothek. Exportiert
   *  wird genau das, was gerade (unter Berücksichtigung der Filter) sichtbar ist. */
  function exportPersonalXlsx() {
    if (typeof XLSX === "undefined") {
      Toast.show("Excel-Export nicht verfügbar (Bibliothek konnte nicht geladen werden).");
      return;
    }
    const header = [
      "Mitarbeiter", "Funktion", "Team", "Projekt", "Projektleiter", "Auftraggeber",
      "Status", "Start-KW", "Start-Jahr", "End-KW", "End-Jahr",
      "Individueller Zeitraum", "Terminüberschneidung"
    ];
    const rows = [header];

    App.getVisiblePersonalEmployees().forEach(({ employee, assignments }) => {
      const name = (employee.vorname + " " + employee.nachname).trim();
      if (!assignments.length) {
        rows.push([name, employee.funktion || "", employee.team || "", "", "", "", "", "", "", "", "", "", ""]);
        return;
      }
      const withConflicts = App.computeAssignmentConflicts(assignments);
      withConflicts.forEach((a) => {
        rows.push([
          name, employee.funktion || "", employee.team || "",
          a.project.name, a.project.projektleiter || "", a.project.auftraggeber || "", a.project.status,
          a.span.startWeek, a.span.startYear, a.span.endWeek, a.span.endYear,
          a.hasOverride ? "Ja" : "Nein",
          a.conflicts.length ? "Ja" : "Nein"
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = header.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Personaleinsatzplanung");
    XLSX.writeFile(wb, "personaleinsatzplanung.xlsx");
    Toast.show("Personaleinsatzplanung als Excel-Datei (.xlsx) exportiert.");
  }

  global.Exporter = { exportProjects, exportTenders, exportPersonalXlsx };
})(window);
