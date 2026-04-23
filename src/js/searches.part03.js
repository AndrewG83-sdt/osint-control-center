 foto OR profilo OR \"profile picture\")",
      ].join(" ");

      searches.push(
        createSearch({
          category: "Immagine correlata",
          tag: "Username",
          title: "Avatar social per username",
          description: "Incrocia l'handle con immagini profilo e avatar presenti su social e pagine indicizzate.",
          query: avatarQuery,
          url: makeGoogleImagesUrl(avatarQuery),
          fields: ["imageDataUrl", "username"],
        })
      );
    }

    if (fullName && normalizedUsername) {
      const identityVisualQuery = [quote(fullName), quote(normalizedUsername), "(foto OR avatar OR profilo)"].join(" ");

      searches.push(
        createSearch({
          category: "Immagine correlata",
          tag: "Nome + username",
          title: "Matching visivo identita",
          description: "Utile per verificare se nome e handle convergono verso le stesse immagini o foto profilo.",
          query: identityVisualQuery,
          url: makeGoogleImagesUrl(identityVisualQuery),
          fields: ["imageDataUrl", "name", "surname", "username"],
        })
      );
    }

    if (location) {
      const contextQuery = [quote(location), "(foto OR immagini OR landmark OR insegna OR esterno)"].join(" ");

      searches.push(
        createSearch({
          category: "Immagine correlata",
          tag: "Luogo",
          title: "Contesto visivo del luogo",
          description: "Aiuta a confrontare sfondi, insegne, landmark e scenari presenti nell'immagine con il luogo indicato.",
          query: contextQuery,
          url: makeGoogleImagesUrl(contextQuery),
          fields: ["imageDataUrl", "location"],
        })
      );
    }

    return searches;
  }

  function buildSocialProfiles(record) {
    const fullName = getFullName(record);
    const username = String(record.username || "").trim().replace(/^@+/, "");
    const location = String(record.location || "").trim();
    const emailLocalPart = getEmailLocalPart(record);
    const socialGraphNodes = (record.graphEntities || []).filter((entity) => entity.type === "social");

    return SOCIAL_PLATFORMS.map((platform) => {
      const weights = SOCIAL_WEIGHTS[platform.name] || SOCIAL_WEIGHTS.Instagram;
      const signals = [];
      let score = 0;

      if (username) {
        score += weights.username;
        signals.push({ label: "handle esatto", weight: weights.username });
      }

      if (fullName) {
        score += weights.name;
        signals.push({ label: "nome completo", weight: weights.name });
      }

      if (location) {
        score += weights.location;
        signals.push({ label: "contesto geografico", weight: weights.location });
      }

      if (record.imageDataUrl) {
        score += weights.image;
        signals.push({ label: "avatar / immagine", weight: weights.image });
      }

      if (emailLocalPart) {
        score += weights.emailAlias;
        signals.push({ label: "alias email", weight: weights.emailAlias });
      }

      const platformGraphNode = socialGraphNodes.find((entity) =>
        `${entity.label} ${entity.value}`.toLowerCase().includes(platform.name.toLowerCase())
      );

      if (platformGraphNode) {
        score += weights.manualNode;
        signals.push({ label: "nodo social nel grafo", weight: weights.manualNode });
      }

      score = Math.min(100, score);

      const matchLabel =
        score >= 82 ? "Alta priorita" : score >= 60 ? "Correlazione promettente" : score >= 38 ? "Segnale iniziale" : "Da rinforzare";
      const searchTerms = [
        `site:${platform.site}`,
        username && quote(username),
        fullName && quote(fullName),
        location && quote(location),
      ]
        .filter(Boolean)
        .join(" ");

      return {
        id: `social-${platform.name.toLowerCase()}`,
        name: platform.name,
        handle: username || "-",
        confidence: score,
        matchLabel,
        directUrl: username ? platform.buildProfileUrl(username) : "",
        searchQuery: searchTerms || `site:${platform.site}`,
        searchUrl: makeGoogleUrl(searchTerms || `site:${platform.site}`),
        notes:
          score >= 60
            ? `${SOCIAL_PLATFORM_HINTS[platform.name]} Conviene salvare i profili compatibili come evidenza e collegarli al grafo.`
            : username || fullName || location
              ? `Il pivot e parziale. ${SOCIAL_PLATFORM_HINTS[platform.name]}`
              : "Aggiungi almeno username, nome o luogo per rafforzare il pivot social.",
        signals: signals.map((signal) => signal.label),
        summary: signals.length ? signals.map((signal) => signal.label).join(" / ") : "Nessun segnale forte",
        riskLabel:
          score >= 82
            ? "Falso positivo ridotto"
            : score >= 60
              ? "Verifica manuale consigliata"
              : "Serve ulteriore conferma",
        nextStep:
          platform.name === "Facebook"
            ? "Controlla omonimie, amici in comune e allineamento geografico."
            : platform.name === "Instagram"
              ? "Confronta naming pattern, avatar e highlight visivi."
              : "Verifica handle, varianti e coerenza tra bio visuale e contenuti brevi.",
      };
    });
  }

  function buildGeoIntelligence(record) {
    const location = String(record.location || "").trim();
    const point = getGeoPoint(record);
    const fullName = getFullName(record);
    const cards = [];

    if (point) {
      cards.push({
        badge: "GPS",
        title: "Coordinate EXIF disponibili",
        body: `Le coordinate ${point.label} possono essere aperte direttamente su mappe e street-level per verificare il contesto reale dell'immagine.`,
      });
    }

    if (location) {
      cards.push({
        badge: "Luogo",
        title: "Pivot geografico attivo",
        body: `Il luogo "${location}" consente di confrontare news locali, mappe, punti di interesse e scenari visuali compatibili.`,
      });
    }

    if (point && location) {
      cards.push({
        badge: "Cross-check",
        title: "Confronta testo e coordinate",
        body: "Verifica se il luogo dichiarato e il punto EXIF raccontano la stessa storia oppure segnalano un mismatch da approfondire.",
      });
    }

    if (fullName && (location || point)) {
      cards.push({
        badge: "Identity",
        title: "Nome e geo-context",
        body: "Nome, luogo e coordinate insieme riducono i falsi positivi e aiutano a priorizzare risultati geograficamente coerenti.",
      });
    }

    if (!cards.length) {
      cards.push({
        badge: "Geo",
        title: "Geo intelligence non ancora attiva",
        body: "Aggiungi un luogo o carica un'immagine con GPS EXIF per aprire mappe, street-level e pivots geografici dedicati.",
      });
    }

    return {
      status: point ? "GPS disponibile" : location ? "Luogo testuale" : "Geo assente",
      cards,
      searches: buildGeoSearches(record),
    };
  }

  function buildCoverageItems(record, score, searchCount) {
    const items = [];
    const tags = parseTags(record.tags);
    const openTasks = getOpenTaskCount(record);
    const point = getGeoPoint(record);

    items.push(`${countIdentifiers(record)} segnali raccolti`);
    items.push(`${searchCount} query pronte`);
    items.push(score >= 60 ? "Alta correlazione" : "Correlazione base");
    items.push(tags.length ? `${tags.length} tag caso` : "IndexedDB attivo");

    if (record.imageOcr?.status === "ready") {
      items.push(`OCR ${record.imageOcr.lines.length} blocchi`);
    }
    if (record.imageExif?.available) {
      items.push("EXIF disponibile");
    }
    if (point) {
      items.push("GPS EXIF");
    } else if (record.location) {
      items.push("Geo pivot attivo");
    }
    if (Array.isArray(record.evidenceBoard) && record.evidenceBoard.length) {
      items.push(`${record.evidenceBoard.length} evidenze`);
    }
    if (Array.isArray(record.timeline) && record.timeline.length) {
      items.push(`${record.timeline.length} eventi`);
    }
    if (Array.isArray(record.graphEntities) && record.graphEntities.length) {
      items.push(`${record.graphEntities.length} nodi manuali`);
    }
    if (Array.isArray(record.graphRelations) && record.graphRelations.length) {
      items.push(`${record.graphRelations.length} relazioni`);
    }
    if (openTasks) {
      items.push(`${openTasks} task aperti`);
    }

    return items;
  }

  function buildRecommendations(record, score, searchCount) {
    const cards = [];
    const fullName = getFullName(record);
    const point = getGeoPoint(record);

    if (score < 35) {
      cards.push({
        badge: "Coverage",
        title: "Aumenta gli identificatori forti",
        body: "Per una ricerca piu efficace conviene combinare almeno due tra username, email, telefono, luogo o immagine. La nuova struttura del caso conserva tutto in IndexedDB.",
      });
    } else {
      cards.push({
        badge: "Correlazione",
        title: "Hai gia una base buona",
        body: `Il caso ha ${searchCount} piste di ricerca pronte. Parti dai segnali piu forti e valida ogni collegamento prima di consolidarlo come match reale.`,
      });
    }

    cards.push({
      badge: "Case",
      title: "Gestisci stato, priorita e tag",
      body: "Ora ogni caso ha stato, priorita e tag dedicati. Usali per separare investigazioni attive, monitorate, validate o archiviate.",
    });

    if (!record.graphEntities?.length) {
      cards.push({
        badge: "Graph",
        title: "Aggiungi nodi manuali al grafo",
        body: "Alias, aziende, documenti, luoghi e contatti manuali alzano il valore investigativo del grafo e aiutano a strutturare i collegamenti che non nascono dal solo form.",
      });
    } else if (!record.graphRelations?.length) {
      cards.push({
        badge: "Relations",
        title: "Collega i nodi con relazioni esplicite",
        body: "Usa relazioni manuali per dichiarare alias, appartenenze, riferimenti geografici o legami con account e documenti, assegnando una confidenza dedicata.",
      });
    }

    if (!record.evidenceBoard?.length || !record.timeline?.length) {
      cards.push({
        badge: "Evidence",
        title: "Consolida evidenze e cronologia",
        body: "Usa Evidence board e Timeline per trasformare i risultati in un dossier piu robusto, con fonti, note operative e sequenza degli eventi.",
      });
    }

    if (!record.tasks?.length) {
      cards.push({
        badge: "Tasks",
        title: "Apri una checklist operativa",
        body: "Aggiungi task per mantenere il caso investigabile: verifiche social, controlli geografici, confronti immagine e chiusura dei match scartati.",
      });
    }

    if (record.username) {
      cards.push({
        badge: "Username",
        title: "Apri prima le fonti a basso costo",
        body: "Uno username consistente e spesso il pivot piu veloce per correlare social, community e repository. Confronta naming, avatar, bio e orari di attivita.",
      });
    }

    if (record.imageDataUrl && (fullName || record.username || record.location)) {
      cards.push({
        badge: "Image match",
        title: "Incrocia l'immagine con gli altri segnali",
        body: "La dashboard genera ricerche correlate per immagini: usa nome, username e luogo per cercare avatar, foto profilo e contesti visivi compatibili.",
      });
    }

    if (fullName && record.location) {
      cards.push({
        badge: "Geo",
        title: "Nome e luogo ora sono un buon cluster",
        body: "Usa luogo e nominativo per ridurre i falsi positivi. Le mappe, le news locali e le directory territoriali diventano molto piu utili in questa fase.",
      });
    } else if (point) {
      cards.push({
        badge: "Geo",
        title: "Le coordinate meritano una verifica sul campo",
        body: "Con GPS EXIF disponibile conviene confrontare mappe, street-level e landmark con quanto emerge da OCR, note e query immag"