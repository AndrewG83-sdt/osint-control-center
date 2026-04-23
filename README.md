# OSINT Control Center

Web app locale-first, gratuita e installabile, pensata come base professionale per gestire ricerche OSINT con un'esperienza piu vicina a una investigation board che a un semplice form.

## Cosa fa ora

- raccoglie input multipli: nome, cognome, username, email, telefono, luogo, immagine e note;
- salva i casi in `IndexedDB`, non piu solo in `localStorage`;
- introduce un vero archivio casi con `stato`, `priorita`, `tag`, data creazione e ultimo aggiornamento;
- costruisce un grafo investigativo in stile entity map;
- permette di estendere il grafo con nodi manuali e relazioni a confidenza variabile;
- permette di trascinare i nodi del grafo e salvare il layout del caso;
- organizza il grafo in cluster visivi con layout automatico avanzato per identita, footprint e segnali manuali;
- genera pack di query OSINT gratuite verso motori di ricerca, social, mappe e reverse image search;
- consente di salvare query e profili social direttamente come evidenze collegate al grafo;
- aggiunge ricerche correlate per immagini incrociando foto con nome, username e luogo;
- estrae OCR locale quando il browser supporta `TextDetector`;
- legge metadati EXIF dai file `JPEG/JPG` direttamente nel browser;
- aggiunge `Geo Intelligence` con mappe, GPS EXIF, street-level e pivot geografici;
- aggiunge `Social Intelligence v2` con segnali, scoring piu ricco e next step per piattaforma;
- separa l'interfaccia in viste dedicate: `Dashboard`, `Social Intelligence`, `Image Intelligence`, `Reports`, `Cases`;
- integra `Evidence board` e `Timeline` per registrare fonti, confidenza, verifiche ed eventi del caso;
- integra `Case Tasks`, ricerca globale e filtri nell'archivio casi;
- esporta JSON, report Markdown e PDF stampabile;
- funziona come PWA e puo essere installata dal browser.

## Stack

- `HTML + CSS + JavaScript` puro
- architettura spezzata in moduli browser-friendly
- `IndexedDB` per persistenza casi
- OCR nativo browser-side quando disponibile
- parser EXIF locale per JPEG/JPG
- nessun framework obbligatorio
- nessun backend richiesto per la versione attuale
- nessun costo API per l'uso base

## Avvio rapido

Puoi aprire `index.html` direttamente, ma per la modalita installabile/PWA conviene usare un piccolo server locale.

### Opzione 1: Python

```powershell
py -m http.server 8080
```

Poi apri:

- `http://localhost:8080`

### Opzione 2: VS Code / Live Server

Se usi VS Code, puoi anche servire la cartella con un'estensione come Live Server.

## Struttura progetto

- [index.html](./index.html)
- [styles.css](./styles.css)
- [app.js](./app.js)
- [js/config.js](./js/config.js)
- [js/utils.js](./js/utils.js)
- [js/storage.js](./js/storage.js)
- [js/searches.js](./js/searches.js)
- [js/image.js](./js/image.js)
- [js/graph.js](./js/graph.js)
- [js/exports.js](./js/exports.js)
- [manifest.webmanifest](./manifest.webmanifest)
- [sw.js](./sw.js)

## Evoluzione della base

Questa versione e piu matura rispetto alla base iniziale:

- il salvataggio casi e persistente e scalabile;
- l'app puo gestire piu investigazioni nello stesso archivio;
- il codice e stato separato per responsabilita;
- la UI e pronta a crescere verso workflow piu vicini a tool OSINT professionali.

## Evoluzione consigliata

Se vuoi trasformarla ancora in una piattaforma OSINT piu potente nelle prossime iterazioni, il percorso migliore e:

1. arricchire il grafo con cluster dinamici, pinning mirato e connessioni dirette a evidenze e timeline;
2. aggiungere OCR, EXIF e annotazioni visuali manuali nell'area `Image Intelligence`;
3. arricchire `Social Intelligence` con confronto bio, avatar, username simili e scoring piu sofisticato;
4. integrare un backend modulare per connettori OSINT opzionali;
5. collegare fonti esterne solo quando rispettano policy, rate limit e requisiti legali del tuo contesto.

## Nota importante

Questa base e costruita per lavorare su fonti pubbliche e casi legittimi. Alcuni servizi esterni gratuiti possono cambiare policy, limitazioni o disponibilita nel tempo.
