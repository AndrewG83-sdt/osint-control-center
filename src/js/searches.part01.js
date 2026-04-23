(() => {
  const { FIELD_META, FIELD_LABELS, SOCIAL_PLATFORMS } = window.OSINT_CONFIG;
  const {
    quote,
    makeGoogleUrl,
    makeGoogleImagesUrl,
    normalizePhone,
    parseTags,
    countIdentifiers,
    formatCoordinateValue,
  } = window.OSINT_UTILS;

  const SOCIAL_WEIGHTS = {
    Facebook: { username: 34, name: 26, location: 18, image: 10, emailAlias: 6, manualNode: 10 },
    Instagram: { username: 42, name: 18, location: 10, image: 16, emailAlias: 6, manualNode: 8 },
    TikTok: { username: 46, name: 14, location: 6, image: 18, emailAlias: 4, manualNode: 8 },
  };

  const SOCIAL_PLATFORM_HINTS = {
    Facebook: "Usa nome, luogo e relazioni dichiarate nel grafo per ridurre omonimie e profili duplicati.",
    Instagram: "Confronta handle, avatar, bio visuale e naming pattern con l'immagine o gli alias del caso.",
    TikTok: "Punta su username, foto profilo, caption e varianti senza cifre per intercettare account collegati.",
  };

  function getFullName(record) {
    return [record.name, record.surname].filter(Boolean).join(" ").trim();
  }

  function getSubjectLabel(record) {
    if (record.caseName) {
      return record.caseName;
    }

    return getFullName(record) || record.username || record.email || record.phone || "Nessun target definito";
  }

  function getEmailLocalPart(record) {
    const email = String(record.email || "").trim();
    return email.split("@")[0] || "";
  }

  function getGeoPoint(record) {
    const latitude = record.imageExif?.gps?.latitude;
    const longitude = record.imageExif?.gps?.longitude;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return null;
    }

    const lat = formatCoordinateValue(latitude);
    const lng = formatCoordinateValue(longitude);

    return {
      latitude,
      longitude,
      lat,
      lng,
      label: `${lat}, ${lng}`,
    };
  }

  function getOpenTaskCount(record) {
    return (record.tasks || []).filter((task) => task.status !== "done").length;
  }

  function computeConfidenceScore(record) {
    let total = 0;

    Object.entries(FIELD_META).forEach(([key, meta]) => {
      if (meta.weight && record[key]) {
        total += meta.weight;
      }
    });

    if (record.name && record.surname) {
      total += 6;
    }

    if (record.username && record.email) {
      total += 6;
    }

    if (record.phone && record.location) {
      total += 4;
    }

    if (parseTags(record.tags).length) {
      total += 2;
    }

    if (Array.isArray(record.graphEntities) && record.graphEntities.length) {
      total += 4;
    }

    if (Array.isArray(record.evidenceBoard) && record.evidenceBoard.length) {
      total += 4;
    }

    return Math.min(100, total);
  }

  function getCaseSummary(record, score, searchCount) {
    const identifiers = countIdentifiers(record);
    const graphEntityCount = Array.isArray(record.graphEntities) ? record.graphEntities.length : 0;
    const graphRelationCount = Array.isArray(record.graphRelations) ? record.graphRelations.length : 0;
    const evidenceCount = Array.isArray(record.evidenceBoard) ? record.evidenceBoard.length : 0;
    const timelineCount = Array.isArray(record.timeline) ? record.timeline.length : 0;
    const openTasks = getOpenTaskCount(record);

    if (!identifiers) {
      return "Inizia inserendo almeno un identificatore per generare grafo, query pack e correlazioni.";
    }

    const quality =
      score >= 75 ? "profilo molto correlabile" : score >= 45 ? "profilo con buoni agganci" : "profilo iniziale";

    return `${identifiers} identificatori attivi, ${searchCount} query generate, ${graphEntityCount} nodi manuali, ${graphRelationCount} relazioni, ${evidenceCount} evidenze, ${timelineCount} eventi timeline, ${openTasks} task aperti, ${quality}. La persistenza in IndexedDB mantiene il caso pronto per evoluzioni future.`;
  }

  function buildSearches(record) {
    const searches = [];
    const fullName = getFullName(record);
    const username = String(record.username || "").trim();
    const email = String(record.email || "").trim();
    const phone = String(record.phone || "").trim();
    const location = String(record.location || "").trim();

    searches.push(...buildSocialSearches({ record, fullName, username, location }));
    searches.push(...buildGeoSearches(record));
    searches.push(...buildImageCorrelationSearches({ record, fullName, username, location }));
    searches.push(...buildOcrSearches({ record, location }));
    searches.push(...buildIdentityVariantSearches({ fullName, username, email, location }));

    if (fullName) {
      const exactQuery = [quote(fullName), location && quote(location)].filter(Boolean).join(" ");
      searches.push(
        createSearch({
          category: "Identita",
          tag: "Nome",
          title: "Ricerca nome esatto",
          description: "Query iniziale per intercettare pagine, articoli, profili e citazioni del nominativo.",
          query: exactQuery,
          url: makeGoogleUrl(exactQuery),
          fields: ["name", "surname"],
        }),
        createSearch({
          category: "Identita",
          tag: "Professionale",
          title: "Footprint professionale",
          description: "Utile per individuare profili lavorativi, CV, conferenze o directory aziendali.",
          query: `site:linkedin.com/in ${quote(fullName)} ${location}`,
          url: makeGoogleUrl(`site:linkedin.com/in ${quote(fullName)} ${location}`),
          fields: ["name", "surname", "location"],
        }),
        createSearch({
          category: "Identita",
          tag: "Comunita",
          title: "Presenza social e community",
          description: "Allarga la ricerca su community, forum e social usando il nome come pivot.",
          query: `${quote(fullName)} site:facebook.com OR site:instagram.com OR site:reddit.com`,
          url: makeGoogleUrl(`${quote(fullName)} site:facebook.com OR site:instagram.com OR site:reddit.com`),
          fields: ["name", "surname"],
        })
      );
    }

    if (username) {
      searches.push(
        createSearch({
          category: "Username",
          tag: "Pivot primario",
          title: "Sweep username globale",
          description: "Cerca lo stesso handle su web, blog, forum e profili indicizzati.",
          query: quote(username),
          url: makeGoogleUrl(quote(username)),
          fields: ["username"],
        }),
        createSearch({
          category: "Username",
          tag: "Developer",
          title: "Traccia tecnica",
          description: "Ideale per capire se l'handle appare su repository, package e community tech.",
          query: `site:github.com OR site:gitlab.com ${quote(username)}`,
          url: makeGoogleUrl(`site:github.com OR site:gitlab.com ${quote(username)}`),
          fields: ["username"],
        }),
        createSearch({
          category: "Username",
          tag: "Social",
          title: "Presenza social",
          description: "Ricerca l'username su social indicizzati per correlare account e alias.",
          query: `site:x.com OR site:instagram.com OR site:tiktok.com ${quote(username)}`,
          url: makeGoogleUrl(`site:x.com OR site:instagram.com OR site:tiktok.com ${quote(username)}`),
          fields: ["username"],
        })
      );
    }

    if (email) {
      const localPart = email.split("@")[0] || email;
      const domain = email.split("@")[1] || "";
      searches.push(
        createSearch({
          category: "Email",
          tag: "Esatta",
          title: "Match email esatto",
          description: "Verifica se l'email compare in pagine pubbliche, forum, profili o documenti.",
          query: quote(email),
          url: makeGoogleUrl(quote(email)),
          fields: ["email"],
        }),
        createSearch({
          category: "Email",
          tag: "Alias",
          title: "Email + alias",
          description: "Collega l'indirizzo ai possibili nickname, soprattutto quando il local part e riusato altrove.",
          query: `${quote(email)} OR ${quote(localPart)} ${location}`,
          url: makeGoogleUrl(`${quote(email)} OR ${quote(localPart)} ${location}`),
          fields: ["email", "location"],
        }),
        createSearch({
          category: "Email",
          tag: "Dominio",
          title: "Contesto dominio",
          description: "Se il dominio e professionale o aziendale, questa ricerca aiuta a ricostruire l'ecosistema collegato.",
          query: domain ? `site:${domain} ${quote(localPart)}` : quote(localPart),
          url: makeGoogleUrl(domain ? `site:${domain} ${quote(localPart)}` : quote(localPart)),
          fields: ["email"],
        })
      );
    }

    if (phone) {
      const normalized = normalizePhone(phone);
      const exactPhoneQuery = normalized.variants.map(quote).join(" OR ");
      searches.push(
        createSearch({
          category: "Telefono",
          tag: "Esatto",
          title: "Numero in pagine pubbliche",
          description: "Cerca il numero in formati diversi per intercettare annunci, directory o citazioni.",
          query: exactPhoneQuery,
          url: makeGoogleUrl(exactPhoneQuery),
          fields: ["phone"],
        }),
        createSearch({
          category: "Telefono",
          tag: "Contesto",
          title: "Numero + luogo",
          description: "Aggiungi il luogo per separare omonimie e restringere il contesto territoriale.",
          query: `${exactPhoneQuery} ${location}`,
          url: makeGoogleUrl(`${exactPhoneQuery} ${location}`),
          fields: ["phone", "location"],
        }),
        createSearch({
          category: "Telefono",
          tag: "Directory",
          title: "Business e directory",
          description: "Utile quando il numero appare in profili business, volantini, registri o pagine locali.",
          query: `${exactPhoneQuery} directory OR azienda OR contatti`,
          url: makeGoogleUrl(`${exactPhoneQuery} directory OR azienda OR contatti`),
          fields: ["phone"],
        })
      );
    }

    if (location) {
      searches.push(
        createSearch({
          category: "Luogo",
          tag: "Geo-context",
          title: "Contesto geografico",
          description: "Apre il contesto territoriale tra mappe, notizie locali e citazioni del luogo.",
          query: quote(location),
          url: makeGoogleUrl(quote(location)),
          fields: ["location"],
        }),
        createSearch({
          category: "Luogo",
          tag: "Mappe",
          title: "Mappe e POI",
          description: "Pista utile per verificare indirizzi, attivita, luoghi e corrispondenze geografiche.",
          query: location,
          url: `https://www.google.com/maps/search/${encodeURIComponent(location)}`,
          fields: ["location"],
        })
      );
    }

    if (fullName && username) {
      searches.push(
        createSearch({
          category: "Correlazione",
          tag: "Nome + username",
          title: "Correlazione identita",
          description: "Usa nome e handle insieme per verificare se appartengono alla stessa persona.",
          query: `${quote(fullName)} ${quote(username)}`,
          url: makeGoogleUrl(`${quote(fullName)} ${quote(username)}`),
          fields: ["name", "surname", "username"],
        })
      );
    }

    if (fullName && email) {
      searches.push(
        createSearch({
          category: "Correlazione",
          tag: "Nome + email",
          title: "Correlazione anagrafica",
          description: "Combina nominativo ed email per trovare profili, documenti o firme digitali.",
          query: `${quote(fullName)} ${quote(email)}`,
          url: makeGoogleUrl(`${quote(fullName)} ${quote(email)}`),
          fields: ["name", "surname", "email"],
        })
      );
    }

    if (record.imageDataUrl) {
      searches.push(
        createSearch({
          category: "Immagine",
          tag: "Reverse",
          title: "Google Lens"