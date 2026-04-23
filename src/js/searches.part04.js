ine.",
      });
    }

    cards.push({
      badge: "Compliance",
      title: "Consolida solo evidenze verificabili",
      body: "Mantieni il progetto su fonti pubbliche, conserva note chiare e separa sempre ipotesi, segnali e conferme. Questo ti aiuta anche quando espanderai la piattaforma con fonti esterne.",
    });

    return cards;
  }

  function createSearch({ category, tag, title, description, query, url, fields }) {
    return { category, tag, title, description, query, url, fields };
  }

  function filterSearches(searches, focusField) {
    if (!focusField) {
      return searches;
    }

    return searches.filter((search) => search.fields.includes(focusField));
  }

  function groupSearchesByCategory(searches) {
    const groups = new Map();

    searches.forEach((search) => {
      if (!groups.has(search.category)) {
        groups.set(search.category, []);
      }

      groups.get(search.category).push(search);
    });

    return Array.from(groups.entries());
  }

  window.OSINT_SEARCHES = {
    getFullName,
    getSubjectLabel,
    computeConfidenceScore,
    getCaseSummary,
    buildSearches,
    buildSocialProfiles,
    buildGeoIntelligence,
    buildCoverageItems,
    buildRecommendations,
    filterSearches,
    groupSearchesByCategory,
  };
})();
