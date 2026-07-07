/* =========================================================
   storage.js – Persistenz (Local Storage) & Beispieldaten
   ========================================================= */

(function (global) {
  "use strict";

  const STORAGE_KEY = "shk_baustellenplaner_v1";

  const PROJECT_STATUS = ["Geplant", "In Ausführung", "Pausiert", "Abgeschlossen", "Storniert"];

  const TENDER_STATUS = [
    "In Bearbeitung",
    "Angebot abgegeben",
    "Auftrag erhalten",
    "Abgesagt",
    "Nicht teilgenommen",
    "Verloren"
  ];

  // Standard-Tags für Projekte (zusätzlich zur Projektfarbe, Mehrfachauswahl).
  // Dienen ausschließlich der fachlichen Beschreibung/Filterung/Suche - anders
  // als die Projektart (siehe DEFAULT_PROJEKTARTEN) haben Tags KEINE Farbe.
  const PROJECT_TAGS = [
    "Heizung", "Lüftung", "Sanitär", "Wärmepumpe", "Strangsanierung", "Öffentlicher Auftraggeber",
    "Heizungserneuerung", "Kleines Projekt"
  ];

  // Standard-Projektarten (rein optische Einordnung der Projektübersicht,
  // siehe Aufgabe "Projektarten und farbliche Kennzeichnung"). Wird in den
  // Einstellungen bearbeitbar sein (Name + Farbe), daher hier nur der
  // Startwert - die tatsächlich aktive Liste liegt in App.state.settings.projektarten.
  const DEFAULT_PROJEKTARTEN = [
    { name: "Großprojekt", color: "#d6ebfb" },
    { name: "Kleines Projekt", color: "#fcdede" },
    { name: "Heizungserneuerung", color: "#fcdede" },
    { name: "Wärmepumpe", color: "#fcdede" },
    { name: "Badezimmer", color: "#fbdfec" }
  ];

  // Standard-Gewerke für Ausschreibungen (Mehrfachauswahl).
  const TENDER_GEWERKE = [
    "Heizung", "Sanitär", "Lüftung", "Strangsanierung", "Sonstige"
  ];

  const DEFAULT_COLORS = [
    "#2f6fed", "#2fa876", "#e2a13a", "#9b5de5",
    "#e2543a", "#0ea5b7", "#c2410c", "#4d7c0f",
    "#be185d", "#4338ca"
  ];

  function defaultSettings() {
    return {
      projektleiter: ["Sven Heise", "Marco Lang", "Tobias Berg"],
      obermonteure: ["Jens Fricke", "Dennis Palm", "Kevin Roth", "Andre Wulf"],
      warnProjekte: 3,
      kritischProjekte: 5,
      mitarbeiterGesamt: 14,
      colorPalette: DEFAULT_COLORS,
      projektarten: DEFAULT_PROJEKTARTEN.slice(),
      // Optionale, standardmäßig DEAKTIVIERTE Obergrenze für die Anzahl
      // gleichzeitig betreuter Projekte je Projektleiter/Obermonteur-Namen.
      // { "Sven Heise": 4 } - fehlt ein Name hier, gilt er als unbegrenzt
      // (Standardfall: mehrere gleichzeitige Projekte sind ausdrücklich erlaubt).
      projektleiterLimits: {},
      obermonteurLimits: {}
    };
  }

  function addWeeks(weekInfo, n) {
    // grober, aber für Beispieldaten ausreichender Wochenoffset
    const monday = Util.mondayOfISOWeek(weekInfo.year, weekInfo.week);
    const shifted = Util.addDays(monday, n * 7);
    return Util.isoWeekInfo(shifted);
  }

  function buildSampleData() {
    const today = Util.isoWeekInfo(new Date());
    const c = DEFAULT_COLORS;

    function span(startOffset, weeks) {
      const s = addWeeks(today, startOffset);
      const e = addWeeks(today, startOffset + weeks - 1);
      return { startYear: s.year, startWeek: s.week, endYear: e.year, endWeek: e.week };
    }

    const projects = [
      Object.assign({
        id: Util.uid("proj"),
        name: "Heizungssanierung Familie Krause",
        auftraggeber: "Familie Krause",
        adresse: "Bergstraße 12, 38700 Braunlage",
        projektleiter: "Sven Heise",
        obermonteur: "Jens Fricke",
        besetzung: 2,
        status: "In Ausführung",
        farbe: c[0],
        bemerkungen: "Öl- auf Wärmepumpe umgestellt, Pufferspeicher wird mitgeliefert.",
        notizen: ""
      }, span(-2, 4)),
      Object.assign({
        id: Util.uid("proj"),
        name: "Neubau EFH Sonnenweg",
        auftraggeber: "Bauherrengemeinschaft Wolter",
        adresse: "Sonnenweg 4, 38700 Braunlage",
        projektleiter: "Marco Lang",
        obermonteur: "Dennis Palm",
        besetzung: 3,
        status: "Geplant",
        farbe: c[1],
        bemerkungen: "Komplette SHK-Installation inkl. Fußbodenheizung.",
        notizen: ""
      }, span(1, 6)),
      Object.assign({
        id: Util.uid("proj"),
        name: "Bädermodernisierung Hotel Harzblick",
        auftraggeber: "Hotel Harzblick GmbH",
        adresse: "Am Kurpark 3, 38700 Braunlage",
        projektleiter: "Sven Heise",
        obermonteur: "Kevin Roth",
        besetzung: 4,
        status: "Geplant",
        farbe: c[2],
        bemerkungen: "6 Gästebäder, Bauablauf mit Hotelbetrieb abstimmen.",
        notizen: ""
      }, span(3, 5)),
      Object.assign({
        id: Util.uid("proj"),
        name: "Gasheizungstausch Mehrfamilienhaus",
        auftraggeber: "Hausverwaltung Nord",
        adresse: "Bahnhofstraße 22, 38700 Braunlage",
        projektleiter: "Tobias Berg",
        obermonteur: "Andre Wulf",
        besetzung: 2,
        status: "Geplant",
        farbe: c[3],
        bemerkungen: "",
        notizen: "Fördermittelantrag läuft noch."
      }, span(0, 3)),
      Object.assign({
        id: Util.uid("proj"),
        name: "Wartung Lüftungsanlage Schule",
        auftraggeber: "Landkreis Goslar",
        adresse: "Schulstraße 9, 38700 Braunlage",
        projektleiter: "Marco Lang",
        obermonteur: "Jens Fricke",
        besetzung: 1,
        status: "Abgeschlossen",
        farbe: c[4],
        bemerkungen: "Jährliche Wartung, abgeschlossen.",
        notizen: ""
      }, span(-6, 1)),
      Object.assign({
        id: Util.uid("proj"),
        name: "Sanitärinstallation Anbau Praxis Dr. Meyer",
        auftraggeber: "Dr. Meyer",
        adresse: "Praxisweg 1, 38700 Braunlage",
        projektleiter: "Tobias Berg",
        obermonteur: "Kevin Roth",
        besetzung: 2,
        status: "Geplant",
        farbe: c[5],
        bemerkungen: "",
        notizen: ""
      }, span(5, 3))
    ].map(withTimestamps);

    const tenders = [
      Object.assign({
        id: Util.uid("tend"),
        name: "Heizungserneuerung Grundschule Braunlage",
        auftraggeber: "Stadt Braunlage",
        ansprechpartner: "Frau Dr. Sommer",
        adresse: "Schulweg 5, 38700 Braunlage",
        submissionDatum: isoDatePlusDays(10),
        submissionUhrzeit: "10:00",
        angebotsstatus: "In Bearbeitung",
        auftragswert: 68000,
        zustaendigIntern: "Sven Heise",
        bearbeitungsfrist: isoDatePlusDays(8),
        bemerkungen: "Öffentliche Ausschreibung, VOB/A.",
        unterlagenLink: "Server: /Ausschreibungen/2026/Grundschule_Braunlage/"
      }, span(9, 5)),
      Object.assign({
        id: Util.uid("tend"),
        name: "SHK-Komplettsanierung Mehrfamilienhaus Parkstraße",
        auftraggeber: "Wohnungsbaugesellschaft Harz",
        ansprechpartner: "Herr Nolte",
        adresse: "Parkstraße 8, 38700 Braunlage",
        submissionDatum: isoDatePlusDays(18),
        submissionUhrzeit: "12:00",
        angebotsstatus: "Angebot abgegeben",
        auftragswert: 145000,
        zustaendigIntern: "Marco Lang",
        bearbeitungsfrist: isoDatePlusDays(16),
        bemerkungen: "Zuschlag erwartet Ende des Monats.",
        unterlagenLink: "Server: /Ausschreibungen/2026/Parkstrasse/"
      }, span(4, 8)),
      Object.assign({
        id: Util.uid("tend"),
        name: "Wärmepumpe Feuerwehrhaus",
        auftraggeber: "Gemeinde Braunlage",
        ansprechpartner: "Herr Krüger",
        adresse: "Feuerwehrweg 2, 38700 Braunlage",
        submissionDatum: isoDatePlusDays(-5),
        submissionUhrzeit: "09:30",
        angebotsstatus: "Auftrag erhalten",
        auftragswert: 42000,
        zustaendigIntern: "Tobias Berg",
        bearbeitungsfrist: isoDatePlusDays(-7),
        bemerkungen: "Zuschlag erhalten – Umwandlung in Projekt aussteht.",
        unterlagenLink: ""
      }, span(2, 4)),
      Object.assign({
        id: Util.uid("tend"),
        name: "Badsanierung Seniorenheim Am Wald",
        auftraggeber: "Seniorenheim Am Wald gGmbH",
        ansprechpartner: "Frau Bahr",
        adresse: "Waldweg 11, 38700 Braunlage",
        submissionDatum: isoDatePlusDays(30),
        submissionUhrzeit: "11:00",
        angebotsstatus: "In Bearbeitung",
        auftragswert: 96000,
        zustaendigIntern: "Sven Heise",
        bearbeitungsfrist: isoDatePlusDays(27),
        bemerkungen: "Kapazität im geplanten Zeitraum prüfen.",
        unterlagenLink: ""
      }, span(3, 6)),
      Object.assign({
        id: Util.uid("tend"),
        name: "Trinkwasserinstallation Industriehalle",
        auftraggeber: "Metallbau Harz GmbH",
        ansprechpartner: "Herr Voss",
        adresse: "Gewerbering 3, 38700 Braunlage",
        submissionDatum: isoDatePlusDays(-20),
        submissionUhrzeit: "14:00",
        angebotsstatus: "Verloren",
        auftragswert: 51000,
        zustaendigIntern: "Marco Lang",
        bearbeitungsfrist: isoDatePlusDays(-22),
        bemerkungen: "An Mitbewerber vergeben.",
        unterlagenLink: ""
      }, span(-10, 3))
    ].map(withTimestamps);

    return { projects, tenders, settings: defaultSettings() };
  }

  function isoDatePlusDays(n) {
    const d = Util.addDays(new Date(), n);
    return d.toISOString().slice(0, 10);
  }

  function withTimestamps(obj) {
    const now = new Date().toISOString();
    obj.createdAt = now;
    obj.updatedAt = now;
    return obj;
  }

  function loadRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Konnte gespeicherte Daten nicht lesen, starte mit Beispieldaten.", e);
      return null;
    }
  }

  function saveRaw(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Speichern fehlgeschlagen", e);
      return false;
    }
  }

  function clearRaw() {
    localStorage.removeItem(STORAGE_KEY);
  }

  const EMPLOYEE_FUNKTIONEN = [
    "Obermonteur", "Monteur", "Servicetechniker", "Isolierer", "Auszubildender", "Leiharbeiter", "Projektleiter"
  ];

  // Freitext-Vorschläge für die Personaleinsatzplanung / Mitarbeiterverwaltung
  // (kein festes Vokabular, nur Datalist-Vorschläge).
  const EMPLOYEE_BESCHAEFTIGUNG = [
    "Vollzeit", "Teilzeit", "Minijob/Aushilfe", "Auszubildender", "Praktikant"
  ];

  // Sortiermodi für die Mitarbeiterzeilen in der Personaleinsatzplanung.
  const PERSONAL_SORT_MODES = [
    { value: "alpha", label: "Alphabetisch" },
    { value: "funktion", label: "Nach Funktion" },
    { value: "team", label: "Nach Team" },
    { value: "manuell", label: "Manuell (Drag & Drop)" }
  ];

  // Sortiermodi für die Projektübersicht im Projektplaner (wird gemerkt).
  const PLANNER_SORT_MODES = [
    { value: "alpha", label: "Alphabetisch" },
    { value: "start", label: "Projektbeginn" },
    { value: "end", label: "Projektende" },
    { value: "auftraggeber", label: "Auftraggeber" },
    { value: "leiter", label: "Projektleiter" },
    { value: "ober", label: "Obermonteur" },
    { value: "status", label: "Status" },
    { value: "projektart", label: "Projektart" }
  ];

  global.Storage = {
    STORAGE_KEY,
    PROJECT_STATUS,
    TENDER_STATUS,
    PROJECT_TAGS,
    TENDER_GEWERKE,
    EMPLOYEE_FUNKTIONEN,
    EMPLOYEE_BESCHAEFTIGUNG,
    PERSONAL_SORT_MODES,
    PLANNER_SORT_MODES,
    DEFAULT_COLORS,
    DEFAULT_PROJEKTARTEN,
    defaultSettings,
    buildSampleData,
    loadRaw,
    saveRaw,
    clearRaw
  };
})(window);
