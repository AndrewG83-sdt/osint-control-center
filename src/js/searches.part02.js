",
          description: "Apri Lens e carica manualmente la stessa immagine per il reverse image search.",
          query: "Carica l'immagine su Google Lens",
          url: "https://lens.google.com/",
          fields: ["imageDataUrl"],
        }),
        createSearch({
          category: "Immagine",
          tag: "Visual",
          title: "Bing Visual Search",
          description: "Secondo pivot visuale gratuito per oggetti, volti, luoghi o screenshot.",
          query: "Carica l'immagine su Bing Visual Search",
          url: "https://www.bing.com/visualsearch",
          fields: ["imageDataUrl"],
        }),
        createSearch({
          category: "Immagine",
          tag: "Alt engine",
          title: "Yandex Images",
          description: "Utile come confronto su corrispondenze visuali in dataset differenti.",
          query: "Carica l'immagine su Yandex Images",
          url: "https://yandex.com/images/",
          fields: ["imageDataUrl"],
        })
      );
    }

    return searches;
  }

  function buildIdentityVariantSearches({ fullName, username, email, location }) {
    const searches = [];

    if (fullName) {
      const parts = fullName.split(" ").filter(Boolean);
      if (parts.length >= 2) {
        const reversed = `${parts.slice(1).join(" ")} ${parts[0]}`;
        searches.push(
          createSearch({
            category: "Varianti",
            tag: "Nome invertito",
            title: "Variante nominativo",
            description: "Controlla la presenza di varianti del nome con ordine invertito o formattazioni alternative.",
            query: `${quote(fullName)} OR ${quote(reversed)} ${location}`,
            url: makeGoogleUrl(`${quote(fullName)} OR ${quote(reversed)} ${location}`),
            fields: ["name", "surname", "location"],
          })
        );
      }
    }

    if (username) {
      const normalized = username.replace(/^@+/, "");
      const noDigits = normalized.replace(/\d+/g, "");

      if (noDigits && noDigits !== normalized) {
        searches.push(
          createSearch({
            category: "Varianti",
            tag: "Username",
            title: "Username simili",
            description: "Utile per trovare handle gemelli o versioni senza numeri usate su altri social.",
            query: `${quote(normalized)} OR ${quote(noDigits)}`,
            url: makeGoogleUrl(`${quote(normalized)} OR ${quote(noDigits)}`),
            fields: ["username"],
          })
        );
      }
    }

    if (email) {
      const domain = email.split("@")[1] || "";
      if (domain) {
        searches.push(
          createSearch({
            category: "Varianti",
            tag: "Dominio email",
            title: "Ecosistema dominio",
            description: "Espande il pivot sul dominio dell'email per cercare altre tracce, contatti e directory correlate.",
            query: `site:${domain} contatti OR team OR profilo`,
            url: makeGoogleUrl(`site:${domain} contatti OR team OR profilo`),
            fields: ["email"],
          })
        );
      }
    }

    return searches;
  }

  function buildOcrSearches({ record, location }) {
    const lines = (record.imageOcr?.lines || [])
      .map((line) => String(line.text || "").trim())
      .filter((text) => text.length >= 4)
      .slice(0, 3);

    if (!lines.length) {
      return [];
    }

    return lines.map((line, index) => {
      const query = [quote(line), location && quote(location)].filter(Boolean).join(" ");
      return createSearch({
        category: "OCR",
        tag: `Testo ${index + 1}`,
        title: `Ricerca testo estratto ${index + 1}`,
        description: "Usa il testo letto dall'immagine come pivot per trovare pagine, profili o contesti corrispondenti.",
        query,
        url: makeGoogleUrl(query),
        fields: ["imageDataUrl", "location"],
      });
    });
  }

  function buildSocialSearches({ record, fullName, username, location }) {
    const searches = [];
    const normalizedUsername = username.replace(/^@+/, "");
    const localPart = getEmailLocalPart(record);
    const activeFields = [];

    if (fullName) {
      activeFields.push("name", "surname");
    }

    if (username) {
      activeFields.push("username");
    }

    if (location) {
      activeFields.push("location");
    }

    if (record.email) {
      activeFields.push("email");
    }

    const correlatedFields = Array.from(new Set(activeFields));

    SOCIAL_PLATFORMS.forEach((platform) => {
      const searchTerms = [
        `site:${platform.site}`,
        username && quote(normalizedUsername),
        fullName && quote(fullName),
        location && quote(location),
      ]
        .filter(Boolean)
        .join(" ");

      if (searchTerms) {
        searches.push(
          createSearch({
            category: "Social",
            tag: platform.name,
            title: `${platform.name} - ricerca indicizzata`,
            description: `Query mirata per ${platform.name} con handle, nominativo e contesto geografico quando disponibili.`,
            query: searchTerms,
            url: makeGoogleUrl(searchTerms),
            fields: correlatedFields.length ? correlatedFields : ["username"],
          })
        );
      }

      if (normalizedUsername) {
        const directUrl = platform.buildProfileUrl(normalizedUsername);
        searches.push(
          createSearch({
            category: "Social",
            tag: `${platform.name} direct`,
            title: `${platform.name} - profilo diretto`,
            description: "Apre direttamente il profilo social costruito dallo username per una verifica rapida dell'handle.",
            query: directUrl,
            url: directUrl,
            fields: ["username"],
          })
        );
      }

      const aliasTerms = [
        `site:${platform.site}`,
        localPart && quote(localPart),
        !normalizedUsername && fullName && quote(fullName),
        location && quote(location),
      ]
        .filter(Boolean)
        .join(" ");

      if (localPart && aliasTerms) {
        searches.push(
          createSearch({
            category: "Social",
            tag: `${platform.name} alias`,
            title: `${platform.name} - alias e bio`,
            description: "Estende la ricerca al local-part dell'email per intercettare handle, bio o naming pattern riusati.",
            query: aliasTerms,
            url: makeGoogleUrl(aliasTerms),
            fields: ["email", "location"],
          })
        );
      }
    });

    if (record.imageDataUrl && normalizedUsername) {
      searches.push(
        createSearch({
          category: "Social",
          tag: "Avatar",
          title: "Avatar e foto profilo",
          description: "Incrocia l'handle con avatar, immagini profilo e pagine social indicizzate.",
          query: `site:instagram.com OR site:facebook.com OR site:tiktok.com ${quote(normalizedUsername)} avatar OR foto`,
          url: makeGoogleImagesUrl(
            `site:instagram.com OR site:facebook.com OR site:tiktok.com ${quote(normalizedUsername)} avatar OR foto`
          ),
          fields: ["username", "imageDataUrl"],
        })
      );
    }

    return searches;
  }

  function buildGeoSearches(record) {
    const searches = [];
    const location = String(record.location || "").trim();
    const fullName = getFullName(record);
    const point = getGeoPoint(record);

    if (location) {
      searches.push(
        createSearch({
          category: "Geo",
          tag: "Maps",
          title: "Google Maps - luogo",
          description: "Apre subito mappe e punti di interesse collegati al luogo inserito.",
          query: location,
          url: `https://www.google.com/maps/search/${encodeURIComponent(location)}`,
          fields: ["location"],
        }),
        createSearch({
          category: "Geo",
          tag: "OSM",
          title: "OpenStreetMap - luogo",
          description: "Confronta il luogo su un motore cartografico alternativo, utile per indirizzi e dettagli di contesto.",
          query: location,
          url: `https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`,
          fields: ["location"],
        }),
        createSearch({
          category: "Geo",
          tag: "Street context",
          title: "Contesto street e news locali",
          description: "Combina il luogo con street view, panorami, landmark ed eventi locali per ricostruire il contesto.",
          query: `${quote(location)} street view OR panorama OR landmark OR cronaca`,
          url: makeGoogleUrl(`${quote(location)} street view OR panorama OR landmark OR cronaca`),
          fields: ["location"],
        })
      );
    }

    if (point) {
      const coordinateQuery = `${point.lat}, ${point.lng}`;
      searches.push(
        createSearch({
          category: "Geo",
          tag: "GPS",
          title: "Coordinate EXIF in mappa",
          description: "Apre le coordinate lette dai metadati EXIF su Google Maps per una verifica immediata.",
          query: coordinateQuery,
          url: `https://www.google.com/maps?q=${encodeURIComponent(coordinateQuery)}`,
          fields: ["imageDataUrl", "location"],
        }),
        createSearch({
          category: "Geo",
          tag: "Street View",
          title: "Street View coordinate",
          description: "Prova ad aprire la vista panoramica o street-level sulle coordinate EXIF disponibili.",
          query: coordinateQuery,
          url: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(coordinateQuery)}`,
          fields: ["imageDataUrl", "location"],
        }),
        createSearch({
          category: "Geo",
          tag: "OSM GPS",
          title: "OpenStreetMap coordinate",
          description: "Secondo pivot cartografico sulle coordinate estratte dai metadati dell'immagine.",
          url: `https://www.openstreetmap.org/?mlat=${encodeURIComponent(point.lat)}&mlon=${encodeURIComponent(point.lng)}#map=18/${encodeURIComponent(point.lat)}/${encodeURIComponent(point.lng)}`,
          fields: ["imageDataUrl", "location"],
        })
      );

      if (fullName) {
        searches.push(
          createSearch({
            category: "Geo",
            tag: "Nome + GPS",
            title: "Correlazione nome e coordinate",
            description: "Usa nominativo e coordinate per cercare menzioni pubbliche o contesti associati al punto geografico.",
            query: `${quote(fullName)} ${quote(coordinateQuery)}`,
            url: makeGoogleUrl(`${quote(fullName)} ${quote(coordinateQuery)}`),
            fields: ["name", "surname", "imageDataUrl", "location"],
          })
        );
      }
    }

    return searches;
  }

  function buildImageCorrelationSearches({ record, fullName, username, location }) {
    if (!record.imageDataUrl) {
      return [];
    }

    const searches = [];
    const normalizedUsername = username.replace(/^@+/, "");

    if (fullName) {
      const fields = ["imageDataUrl", "name", "surname"];
      if (location) {
        fields.push("location");
      }

      const portraitQuery = [
        quote(fullName),
        location && quote(location),
        "(foto OR ritratto OR avatar OR \"immagine profilo\")",
      ]
        .filter(Boolean)
        .join(" ");

      searches.push(
        createSearch({
          category: "Immagine correlata",
          tag: "Nome",
          title: "Foto collegate al nominativo",
          description: "Ricerca immagini e possibili foto profilo associate al nominativo, con contesto geografico quando presente.",
          query: portraitQuery,
          url: makeGoogleImagesUrl(portraitQuery),
          fields,
        })
      );
    }

    if (normalizedUsername) {
      const avatarQuery = [
        "site:instagram.com OR site:facebook.com OR site:tiktok.com",
        quote(normalizedUsername),
        "(avatar OR