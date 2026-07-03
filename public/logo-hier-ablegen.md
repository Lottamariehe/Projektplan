# Firmenlogo hier ablegen

Die Anwendung sucht das Firmenlogo automatisch unter folgendem Pfad:

```
public/logo.png
```

So bindest du dein Logo ein:

1. Logo-Datei besorgen (idealerweise als PNG mit transparentem Hintergrund, Höhe ca. 80–120 Pixel reicht völlig aus – die Anzeige im Kopfbereich ist kompakt).
2. Datei umbenennen in genau: `logo.png`
3. Die Datei in diesen Ordner (`public/`) legen, sodass sie im GitHub-Repository unter `public/logo.png` liegt.
4. Änderung ins GitHub-Repository hochladen (siehe ERWEITERUNGEN-ANLEITUNG.md) – Cloudflare Pages baut automatisch neu.
5. Seite neu laden: Das Logo erscheint links im Kopfbereich neben "Baustellenplaner".

Falls (noch) keine Datei unter `public/logo.png` vorhanden ist, blendet sich die Logo-Fläche automatisch unsichtbar aus – es entsteht keine kaputte Bild-Anzeige. Die App funktioniert also auch ganz ohne Logo einwandfrei.

Andere Dateiformate (z. B. `.svg` oder `.jpg`) sind möglich, dann muss in `index.html` die Zeile

```html
<img src="public/logo.png" alt="Firmenlogo" class="brand-logo" id="brandLogo" onerror="this.classList.add('hidden')">
```

beim `src`-Attribut entsprechend angepasst werden (z. B. `public/logo.svg`).
