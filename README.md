# OSINT Control Center

Web app locale-first, gratuita e installabile, pensata come base professionale per gestire ricerche OSINT con un'esperienza vicina a una investigation board.

## Funzioni principali

- Raccolta input: nome, cognome, username, email, telefono, luogo, immagine e note.
- Archivio casi persistente in `IndexedDB` con stato, priorita, tag, data creazione e ultimo aggiornamento.
- Grafo investigativo editabile con nodi manuali, relazioni, confidenza, drag-and-drop e cluster visivi.
- Query pack OSINT gratuiti verso motori di ricerca, social, mappe e reverse image search.
- Social Intelligence per Facebook, Instagram e TikTok con scoring euristico e salvataggio profili come evidenze.
- Image Intelligence con preview sicura, OCR browser-side quando disponibile, EXIF JPEG/JPG e Geo Intelligence.
- Evidence board, timeline investigativa, checklist operativa e ricerca globale tra i casi.
- Export JSON, report Markdown e PDF stampabile.
- PWA installabile dal browser quando servita da `localhost` o HTTPS.

## Stack

- `HTML + CSS + JavaScript` puro.
- Nessun framework obbligatorio.
- Nessun backend richiesto per la versione attuale.
- Nessuna API a pagamento per l'uso base.
- Persistenza locale tramite `IndexedDB`.

## Avvio rapido

Questa versione GitHub ricompone i sorgenti con `boot.js`, quindi va servita da `localhost` o HTTPS. Evita `file://`, perche il browser puo bloccare i `fetch` locali dei blocchi sorgente.

```powershell
py -m http.server 8080
```

Poi apri:

```text
http://localhost:8080
```

## Struttura GitHub

Questa pubblicazione usa una shell leggera che ricompone i sorgenti lato browser:

- [index.html](./index.html): shell di avvio GitHub-ready.
- [boot.js](./boot.js): loader che ricompone markup, CSS e moduli applicativi.
- [src/](./src): sorgenti applicativi suddivisi in blocchi.
- [js/config.js](./js/config.js), [js/utils.js](./js/utils.js), [js/storage.js](./js/storage.js): moduli core piccoli caricati direttamente.
- [manifest.webmanifest](./manifest.webmanifest), [sw.js](./sw.js), [favicon.svg](./favicon.svg): asset PWA.

## Nota etica e legale

Questo progetto e pensato per uso legittimo su fonti pubbliche, ricerca difensiva, analisi autorizzate, giornalismo, threat intelligence e gestione di casi con consenso o base legale adeguata. Non e pensato per stalking, doxxing, molestie, accesso non autorizzato o raccolta abusiva di dati personali.

Quando apri query verso motori di ricerca, social o mappe, i termini del caso vengono inviati a servizi terzi per design. Evita di inserire dati reali se non hai una base legale o operativa chiara.

## Roadmap consigliata

1. Backup e restore completo del vault IndexedDB.
2. Import/export casi multipli.
3. Connettori OSINT opzionali e modulari, solo per fonti compatibili con policy e rate limit.
4. Annotazioni visuali manuali nell'area Image Intelligence.
5. Report template piu avanzati per executive summary, evidenze validate e appendice fonti.
