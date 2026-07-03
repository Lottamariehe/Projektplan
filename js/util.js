/* =========================================================
   util.js – Datum-, Kalenderwochen- und Hilfsfunktionen
   Global unter window.Util verfügbar (kein Modul-System,
   damit die App auch per Doppelklick auf index.html läuft).
   ========================================================= */

(function (global) {
  "use strict";

  /** Liefert {year, week} nach ISO-8601 für ein gegebenes Datum. */
  function isoWeekInfo(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = (d.getUTCDay() + 6) % 7; // Montag = 0 ... Sonntag = 6
    d.setUTCDate(d.getUTCDate() - dayNum + 3); // auf den Donnerstag dieser Woche
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
    const week = 1 + Math.round((d - firstThursday) / (7 * 24 * 3600 * 1000));
    return { year: d.getUTCFullYear(), week: week };
  }

  /** Anzahl ISO-Kalenderwochen in einem Jahr (52 oder 53). */
  function isoWeeksInYear(year) {
    const p = (y) => (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7;
    return (p(year) === 4 || p(year - 1) === 3) ? 53 : 52;
  }

  /** Liefert das Datum (Montag, lokale Zeit 00:00) einer ISO-Kalenderwoche. */
  function mondayOfISOWeek(year, week) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const monday = new Date(simple);
    const diff = dow <= 4 ? (1 - dow) : (8 - dow);
    monday.setDate(simple.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function sameWeek(a, b) {
    return a.year === b.year && a.week === b.week;
  }

  /** Vergleicht zwei {year, week} Objekte. Ergebnis < 0, 0, > 0. */
  function compareWeeks(a, b) {
    if (a.year !== b.year) return a.year - b.year;
    return a.week - b.week;
  }

  const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  function formatDateDE(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("de-DE");
  }

  function formatCurrency(value) {
    if (value === null || value === undefined || value === "") return "";
    const num = Number(value);
    if (isNaN(num)) return "";
    return num.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  global.Util = {
    isoWeekInfo,
    isoWeeksInYear,
    mondayOfISOWeek,
    addDays,
    sameWeek,
    compareWeeks,
    formatDateDE,
    formatCurrency,
    uid,
    debounce,
    clamp,
    escapeHtml,
    MONTH_NAMES_SHORT
  };
})(window);
