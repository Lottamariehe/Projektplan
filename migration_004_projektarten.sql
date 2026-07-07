-- =========================================================
-- migration_004_projektarten.sql
-- Additive Migration für BESTEHENDE Datenbanken. Fügt die
-- Spalte "projektart" zu projects hinzu (rein optisch, siehe
-- Aufgabe "Projektarten und farbliche Kennzeichnung"). Die
-- eigentliche Liste der verfügbaren Projektarten inkl. Farben
-- lebt - genau wie Projektleiter/Obermonteure/Farbpalette -
-- in der bestehenden Tabelle "settings" (JSON-Feld
-- "projektarten"), NICHT in einer eigenen Tabelle. Das
-- vermeidet doppelte Datenhaltung und ist konsistent mit dem
-- bisherigen Muster für frei bearbeitbare Auswahllisten.
--
-- Bestehende Projekte bleiben vollständig erhalten - die neue
-- Spalte ist NULLABLE, bereits vorhandene Projekte zeigen ohne
-- weiteres Zutun einfach keine Projektart-Einfärbung an.
--
-- Anwenden mit:
--   wrangler d1 execute <DB-NAME> --remote --file=./migration_004_projektarten.sql
-- =========================================================

ALTER TABLE projects ADD COLUMN projektart TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_projektart ON projects (projektart);
