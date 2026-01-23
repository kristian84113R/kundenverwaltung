# Kundenverwaltung

Eine Desktop-Anwendung zur Verwaltung von Kunden und Aufträgen für kleine Handwerksbetriebe - entwickelt mit Electron.

![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

[![GitHub Release](https://img.shields.io/github/v/release/kristian84113R/kundenverwaltung?style=for-the-badge)](https://github.com/kristian84113R/kundenverwaltung/releases/latest)

## 📥 Download

**[⬇️ Neueste Version herunterladen](https://github.com/kristian84113R/kundenverwaltung/releases/latest)**

Nach der Erstinstallation aktualisiert sich die App automatisch.

## 💡 Über dieses Projekt

Dieses Projekt entstand aus einem echten Bedarf: Mein Vater betreibt einen Garten- und Landschaftsbaubetrieb und hatte bisher keine digitale Lösung zur Kundenverwaltung – alles lief über Papierordner und Gedächtnis.

Ich habe diese App entwickelt, um ihm den Einstieg in die Digitalisierung so einfach wie möglich zu machen, mit einer Lösung die:
- Keine Cloud-Anbindung benötigt (Datenschutz!)
- Bestehende PDF-Rechnungen importieren kann
- Auch ohne technische Kenntnisse bedienbar ist

**Das Besondere:** Der PDF-Import analysiert automatisch Rechnungen, extrahiert Kundendaten und erstellt direkt Aufträge mit allen Details.

## 🎓 Was ich gelernt habe

- **Electron** - Desktop-Apps mit Web-Technologien bauen
- **PDF-Parsing** - Text aus PDFs extrahieren und strukturiert verarbeiten
- **IPC-Kommunikation** - Sichere Brücke zwischen Main- und Renderer-Prozess
- **Regex & Text-Analyse** - Kundendaten aus unstrukturiertem Text extrahieren
- **UX Design** - Eine intuitive Oberfläche für nicht-technische Nutzer

## ✨ Features

### Kundenverwaltung
- Kunden anlegen, bearbeiten und löschen
- Kontaktdaten (Name, Adresse, Telefon, E-Mail)
- Direkte Google Maps Integration

### Auftragsverwaltung
- Aufträge pro Kunde erstellen
- Datum, Preis und Beschreibung erfassen
- Mehrere Dateien (PDFs, Bilder) pro Auftrag anhängen

### PDF-Rechnungsimport 📄
- **Automatischer Import** aus bestehenden PDF-Rechnungen
- Extrahiert Kundendaten (Name, Adresse, Ansprechpartner)
- Extrahiert Auftragsdaten (Datum, Preis, Leistungsbeschreibung)
- Hängt die Original-PDF automatisch an
- Intelligente Duplikaterkennung: Bei existierenden Kunden werden neue Aufträge automatisch hinzugefügt

### Automatische Updates 🔄
- App prüft beim Start auf neue Versionen
- Updates werden im Hintergrund heruntergeladen
- Ein-Klick-Installation neuer Versionen

## 🛠️ Tech Stack

- **Frontend:** HTML, JavaScript, Tailwind CSS
- **Desktop:** Electron
- **PDF-Parsing:** pdf-parse
- **Auto-Updates:** electron-updater + GitHub Releases
- **Icons:** Lucide Icons
- **Datenspeicherung:** Lokale JSON-Dateien (keine Cloud/Server nötig)

## 📦 Installation

```bash
# Repository klonen
git clone https://github.com/kristian84113R/kundenverwaltung.git
cd kundenverwaltung

# Abhängigkeiten installieren
npm install

# App starten
npm start
```

## 🏗️ Build

Windows-Installer erstellen:

```bash
npm run build
```

Die Setup-Datei wird im `dist/` Ordner erstellt.

### Release veröffentlichen

```bash
# GitHub Token als Umgebungsvariable setzen
set GH_TOKEN=dein_github_token

# Version in package.json erhöhen, dann:
npm run release
```

Dies erstellt automatisch ein GitHub Release mit Installer und Auto-Update-Dateien.

## 🧪 Tests

```bash
npm test
```

## 📁 Projektstruktur

```
kundenapp/
├── main-electron.js    # Electron Main Process
├── preload.js          # Preload Script (IPC Bridge)
├── index.html          # Kundenübersicht
├── customer.html       # Kundendetails
├── new-customer.html   # Kunde anlegen/bearbeiten
├── order.html          # Auftrag anlegen/bearbeiten
├── import-customers.html # PDF-Import
├── main.js             # Frontend Logic
├── utils.js            # Hilfsfunktionen
└── styles.css          # Custom Styles
```

## 🔒 Datenspeicherung

Alle Daten werden **lokal** gespeichert:
- `%AppData%/kundenapp/customers.json` - Kundendaten
- `%AppData%/kundenapp/customer_files/` - Angehängte Dateien

Keine Cloud-Anbindung, keine externen Server - die Daten bleiben auf dem Rechner.

## 📸 Screenshots

### Kundenübersicht
![Kundenübersicht](./screenshot-overview.png)

### Kundendetails
![Kundendetails](./screenshot-customer.png)

### PDF-Import
![PDF-Import](./screenshot-import.png)

## 🚀 Geplante Features

- [ ] Umsatz-Statistiken Dashboard
- [ ] Rechnungen erstellen & PDF-Export
- [ ] Kalender für Terminplanung

## 📄 Lizenz

MIT License

---

*Entwickelt als praktisches Projekt für einen Garten- und Landschaftsbaubetrieb.*
