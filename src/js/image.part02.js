).toISOString(),
        errorMessage: "OCR non riuscito con il motore nativo del browser.",
      };
    }
  }

  async function detectTextFromDataUrl(dataUrl) {
    if (!("TextDetector" in window)) {
      return unsupportedOcrResult();
    }

    try {
      const image = await loadImage(dataUrl);
      const detector = new window.TextDetector();
      const blocks = await detector.detect(image);
      return normalizeOcrBlocks(blocks);
    } catch {
      return {
        status: "error",
        supported: true,
        fullText: "",
        lines: [],
        analyzedAt: new Date().toISOString(),
        errorMessage: "OCR non riuscito sulla copia locale dell'immagine.",
      };
    }
  }

  function unsupportedOcrResult() {
    return {
      status: "unsupported",
      supported: false,
      fullText: "",
      lines: [],
      analyzedAt: new Date().toISOString(),
      errorMessage: "OCR nativo non supportato da questo browser.",
    };
  }

  function normalizeOcrBlocks(blocks) {
    const lines = (blocks || [])
      .map((block) => String(block.rawValue || "").trim())
      .filter(Boolean)
      .map((text, index) => ({
        id: `ocr-${index + 1}`,
        text,
      }));

    return {
      status: lines.length ? "ready" : "empty",
      supported: true,
      fullText: lines.map((line) => line.text).join("\n"),
      lines,
      analyzedAt: new Date().toISOString(),
      errorMessage: "",
    };
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });
  }

  function buildImageInsights(record) {
    const insights = [
      {
        badge: "Reverse",
        title: "Confronta almeno due motori",
        body: "Lens, Bing Visual Search e Yandex usano dataset differenti. Un match mancato in una fonte non esclude un risultato valido altrove.",
      },
    ];

    if (record.imageExif?.available) {
      insights.push({
        badge: "EXIF",
        title: "Metadati tecnici disponibili",
        body: record.imageExif.summary || "Sono disponibili metadati tecnici utili per contestualizzare l'immagine.",
      });
    } else if (record.imageDataUrl) {
      insights.push({
        badge: "EXIF",
        title: "Metadati limitati o assenti",
        body: "Molte immagini social vengono ripulite dai metadati. Se ti servono coordinate o date originali, conviene lavorare sul file sorgente.",
      });
    }

    if (record.imageOcr?.status === "ready" && record.imageOcr.lines.length) {
      insights.push({
        badge: "OCR",
        title: "Testo individuato nell'immagine",
        body: `OCR locale completato con ${record.imageOcr.lines.length} blocchi testuali. Usa il testo estratto come pivot per query web e correlazioni.`,
      });
    } else if (record.imageOcr?.status === "unsupported") {
      insights.push({
        badge: "OCR",
        title: "OCR nativo non disponibile",
        body: "Il browser attuale non espone TextDetector. Puoi comunque usare la checklist manuale e reimportare l'immagine in un browser compatibile.",
      });
    }

    if (record.location) {
      insights.push({
        badge: "Geo",
        title: "Verifica sfondi e landmark",
        body: "Se hai un luogo, confronta insegne, esterni, testi visibili e architetture con ricerche immagini sul contesto geografico.",
      });
    }

    if (record.username) {
      insights.push({
        badge: "Avatar",
        title: "Incrocia la foto con i profili social",
        body: "Lo username aiuta a trovare avatar e immagini profilo pubbliche. Confronta ritagli, colori, sfondi e varianti della stessa foto.",
      });
    }

    if (getFullName(record)) {
      insights.push({
        badge: "Identity",
        title: "Cerca foto associate al nominativo",
        body: "Un nome completo rafforza la ricerca di foto profilo, articoli, interviste o menzioni pubbliche con immagini abbinate.",
      });
    }

    return insights;
  }

  function buildImageChecklist(record) {
    const ocrReady = Boolean(record.imageOcr?.status === "ready" && record.imageOcr.lines.length);

    return [
      {
        title: "Volto o soggetto principale",
        body: "Confronta lineamenti, pose ricorrenti, crop dell'avatar e sfondo con immagini pubbliche note.",
        ready: Boolean(record.username || getFullName(record)),
      },
      {
        title: "Luogo e scenario",
        body: "Osserva insegne, interni, esterni, mezzi, colori dominanti e punti di riferimento.",
        ready: Boolean(record.location || record.imageExif?.gps),
      },
      {
        title: "Testo visibile",
        body: ocrReady
          ? "OCR locale ha gia rilevato testo. Verifica i blocchi estratti e usa le parti piu distintive come query."
          : "Segna manualmente scritte, badge, nickname, handle, cartelli o targhe leggibili.",
        ready: ocrReady,
      },
      {
        title: "Timeline",
        body: "Valuta se vestiti, branding o stagionalita dell'immagine sono coerenti con il periodo del caso.",
        ready: Boolean(record.notes || record.imageExif?.capturedAt || record.imageExif?.modifiedAt),
      },
    ];
  }

  function buildExifCards(record) {
    const exif = record.imageExif;

    if (!exif?.available) {
      return [
        {
          label: "Stato EXIF",
          value: exif?.summary || "Nessun metadato EXIF disponibile.",
        },
      ];
    }

    const cards = [
      { label: "Camera", value: [exif.make, exif.model].filter(Boolean).join(" ") || "-" },
      { label: "Data scatto", value: exif.capturedAt || exif.modifiedAt || "-" },
      { label: "Software", value: exif.software || "-" },
      { label: "Orientamento", value: exif.orientation || "-" },
      { label: "Dimensioni EXIF", value: exif.dimensions || "-" },
      { label: "ISO", value: exif.iso || "-" },
      { label: "Esposizione", value: exif.exposureTime || "-" },
      { label: "Focale", value: exif.focalLength || "-" },
    ];

    if (exif.gps?.coordinates) {
      cards.push({ label: "Coordinate", value: exif.gps.coordinates });
    }

    if (exif.gps?.altitude) {
      cards.push({ label: "Altitudine", value: exif.gps.altitude });
    }

    return cards;
  }

  function buildOcrSummary(record) {
    const ocr = record.imageOcr || unsupportedOcrResult();

    if (ocr.status === "ready") {
      return {
        title: "OCR locale completato",
        body: `${ocr.lines.length} blocchi testuali estratti il ${formatDate(ocr.analyzedAt)}.`,
      };
    }

    if (ocr.status === "empty") {
      return {
        title: "OCR completato senza testo",
        body: "Il motore nativo non ha rilevato testo significativo nell'immagine.",
      };
    }

    if (ocr.status === "unsupported") {
      return {
        title: "OCR non supportato",
        body: ocr.errorMessage,
      };
    }

    if (ocr.status === "error") {
      return {
        title: "OCR non riuscito",
        body: ocr.errorMessage || "Si e verificato un errore durante l'analisi del testo.",
      };
    }

    return {
      title: "OCR non eseguito",
      body: "Carica o rianalizza un'immagine per tentare l'estrazione locale del testo.",
    };
  }

  window.OSINT_IMAGE = {
    inspectImageFile,
    reanalyzeImageFromDataUrl,
    buildImageInsights,
    buildImageChecklist,
    buildExifCards,
    buildOcrSummary,
  };
})();
