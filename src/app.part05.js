      <label class="selection-chip">
              <input type="checkbox" value="${escapeHtml(relation.id)}" />
              <span>${escapeHtml(
                `${graphLookup.get(relation.sourceId) || relation.sourceId} -> ${graphLookup.get(relation.targetId) || relation.targetId} (${relation.label})`
              )}</span>
            </label>
          `
        )
        .join("")
    : `<p class="saved-case-meta">Nessuna relazione manuale disponibile.</p>`;
}

function renderQueryCards(container, searches) {
  if (!searches.length) {
    container.innerHTML = `
      <div class="query-card">
        <div class="query-card-header">
          <div>
            <p class="query-category">Workspace vuoto</p>
            <h4 class="query-title">Nessuna query disponibile</h4>
          </div>
          <span class="query-tag">Start</span>
        </div>
        <p class="query-description">Inserisci almeno un identificatore per popolare questo spazio investigativo.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = searches
    .map(
      (search) => `
        <article class="query-card">
          <div class="query-card-header">
            <div>
              <p class="query-category">${escapeHtml(search.category)}</p>
              <h4 class="query-title">${escapeHtml(search.title)}</h4>
            </div>
            <span class="query-tag">${escapeHtml(search.tag)}</span>
          </div>
          <p class="query-description">${escapeHtml(search.description)}</p>
          <pre class="query-text">${escapeHtml(search.query)}</pre>
          <div class="query-actions">
            <button class="button button-secondary small" type="button" data-open-url="${escapeHtml(search.url)}">Apri</button>
            <button class="button button-ghost small" type="button" data-copy-text="${escapeHtml(search.query)}">Copia query</button>
            <button class="button button-ghost small" type="button" data-save-search="${escapeHtml(search.id)}">Salva evidenza</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderRecommendationsPanel(record, score, searchCount) {
  dom.recommendations.innerHTML = buildRecommendations(record, score, searchCount)
    .map(
      (card) => `
        <article class="recommendation-card">
          <span class="recommendation-badge">${escapeHtml(card.badge)}</span>
          <h4>${escapeHtml(card.title)}</h4>
          <p>${escapeHtml(card.body)}</p>
        </article>
      `
    )
    .join("");
}

function renderCaseArchive(container, cases, options = {}) {
  const {
    emptyTitle = "Nessun caso in archivio",
    emptyBody = "Crea il primo caso per iniziare a usare il nuovo vault persistente.",
  } = options;

  if (!cases.length) {
    container.innerHTML = `
      <div class="saved-case-card">
        <h4>${escapeHtml(emptyTitle)}</h4>
        <p class="saved-case-meta">${escapeHtml(emptyBody)}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = cases
    .map((record) => {
      const activeClass = record.id === state.currentCaseId ? " case-card-active" : "";
      const tags = parseTags(record.tags);

      return `
        <article class="saved-case-card${activeClass}">
          <div class="saved-case-header">
            <div>
              <div class="case-title-row">
                <h4>${escapeHtml(getSubjectLabel(record))}</h4>
                ${record.id === state.currentCaseId ? '<span class="case-pill">Attivo</span>' : ""}
              </div>
              <p class="saved-case-meta">Aggiornato il ${escapeHtml(formatDate(record.updatedAt))}</p>
            </div>
            <span class="case-pill">${escapeHtml(record.priority || "medium")}</span>
          </div>
          <div class="case-meta-row">
            <span>${escapeHtml(record.status || "active")}</span>
            <span>${Object.keys(FIELD_LABELS).filter((key) => Boolean(record[key])).length} segnali</span>
            <span>${record.graphEntities?.length || 0} nodi</span>
            <span>${record.graphRelations?.length || 0} relazioni</span>
            <span>${record.evidenceBoard?.length || 0} evidenze</span>
            <span>${record.timeline?.length || 0} eventi</span>
            <span>${(record.tasks || []).filter((task) => task.status !== "done").length} task aperti</span>
          </div>
          <div class="case-meta-row">${tags.length ? tags.map((tag) => `#${escapeHtml(tag)}`).join(" ") : "Nessun tag"}</div>
          <div class="saved-case-actions">
            <button class="button button-secondary small" type="button" data-load-case="${record.id}">Apri</button>
            <button class="button button-ghost small" type="button" data-delete-case="${record.id}">Elimina</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSocialProfiles(profiles) {
  dom.socialProfiles.innerHTML = profiles
    .map((profile) => {
      const directButton = profile.directUrl
        ? `<button class="button button-secondary small" type="button" data-open-url="${escapeHtml(profile.directUrl)}">Profilo diretto</button>`
        : "";
      const signalMarkup = profile.signals?.length
        ? `<div class="case-meta-row">${profile.signals.map((signal) => `<span class="hero-chip compact-chip">${escapeHtml(signal)}</span>`).join("")}</div>`
        : "";

      return `
        <article class="social-card">
          <div class="social-card-header">
            <div>
              <p class="social-label">${escapeHtml(profile.name)}</p>
              <h4>${escapeHtml(profile.matchLabel)}</h4>
            </div>
            <span class="social-tag">${escapeHtml(profile.handle)}</span>
          </div>
          <div class="social-score">
            <strong>${profile.confidence}%</strong>
            <span>stima correlazione</span>
          </div>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width:${profile.confidence}%"></div>
          </div>
          ${signalMarkup}
          <p class="saved-case-meta">${escapeHtml(profile.summary || "")}</p>
          <p>${escapeHtml(profile.notes)}</p>
          <div class="case-meta-row">
            <span>${escapeHtml(profile.riskLabel || "-")}</span>
            <span>${escapeHtml(profile.nextStep || "-")}</span>
          </div>
          <div class="social-actions">
            <button class="button button-ghost small" type="button" data-open-url="${escapeHtml(profile.searchUrl)}">Ricerca indicizzata</button>
            ${directButton}
            <button class="button button-ghost small" type="button" data-copy-text="${escapeHtml(profile.searchQuery)}">Copia query</button>
            <button class="button button-ghost small" type="button" data-save-social-profile="${escapeHtml(profile.id)}">Salva evidenza</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderImagePanel(record) {
  const safeImageDataUrl = getSafeImageDataUrl(record.imageDataUrl);

  if (!record.imageDataUrl) {
    dom.imagePreview.className = "image-preview empty";
    const message = document.createElement("p");
    message.textContent = "Carica un'immagine per vedere anteprima e trigger per reverse image search.";
    dom.imagePreview.replaceChildren(message);
    dom.imageMeta.innerHTML = "";
    dom.imageStatus.textContent = "Nessuna immagine";
    return;
  }

  if (!safeImageDataUrl) {
    dom.imagePreview.className = "image-preview empty";
    const warning = document.createElement("p");
    warning.textContent = "Formato immagine non supportato per la preview sicura.";
    dom.imagePreview.replaceChildren(warning);
    dom.imageMeta.innerHTML = "";
    dom.imageStatus.textContent = "Preview non disponibile";
    return;
  }

  dom.imagePreview.className = "image-preview";
  const image = document.createElement("img");
  image.src = safeImageDataUrl;
  image.alt = "Anteprima immagine investigativa";
  dom.imagePreview.replaceChildren(image);
  dom.imageStatus.textContent = "Immagine collegata";
  dom.imageMeta.innerHTML = [
    renderMetaCard("File", record.imageName || "Sconosciuto"),
    renderMetaCard("Formato", record.imageType || "n/d"),
    renderMetaCard("Dimensione", formatBytes(record.imageSize)),
    renderMetaCard("Ultimo update", formatDate(record.imageUpdatedAt)),
    renderMetaCard("Ultima analisi", formatDate(record.imageAnalysisUpdatedAt)),
    renderMetaCard("OCR blocchi", String(record.imageOcr?.lines?.length || 0)),
  ].join("");
}

function renderImageIntel(record, geoIntel) {
  dom.imageInsights.innerHTML = buildImageInsights(record)
    .map(
      (card) => `
        <article class="recommendation-card">
          <span class="recommendation-badge">${escapeHtml(card.badge)}</span>
          <h4>${escapeHtml(card.title)}</h4>
          <p>${escapeHtml(card.body)}</p>
        </article>
      `
    )
    .join("");

  dom.exifStatus.textContent = record.imageExif?.available ? "EXIF disponibile" : "Nessun EXIF";
  dom.imageExifCards.innerHTML = buildExifCards(record)
    .map(
      (item) => `
        <article class="saved-case-card">
          <h4>${escapeHtml(item.label)}</h4>
          <p class="saved-case-meta">${escapeHtml(item.value || "-")}</p>
        </article>
      `
    )
    .join("");

  const ocrSummary = buildOcrSummary(record);
  dom.ocrStatus.textContent =
    record.imageOcr?.status === "ready"
      ? "OCR pronto"
      : record.imageOcr?.status === "unsupported"
        ? "OCR non supportato"
        : record.imageOcr?.status === "error"
          ? "OCR errore"
          : record.imageOcr?.status === "empty"
            ? "OCR senza testo"
            : "OCR inattivo";

  dom.imageOcrSummary.innerHTML = `
    <article class="saved-case-card">
      <h4>${escapeHtml(ocrSummary.title)}</h4>
      <p class="saved-case-meta">${escapeHtml(ocrSummary.body)}</p>
    </article>
  `;

  const ocrLines = record.imageOcr?.lines || [];
  dom.imageOcrLines.innerHTML = ocrLines.length
    ? ocrLines
        .map(
          (line, index) => `
            <article class="saved-case-card">
              <h4>Blocco OCR ${index + 1}</h4>
              <p class="saved-case-meta">${escapeHtml(line.text)}</p>
            </article>
          `
        )
        .join("")
    : `
      <article class="saved-case-card">
        <h4>Nessun testo estratto</h4>
        <p class="saved-case-meta">Quando disponibile, il testo rilevato comparira qui ed entrera nel report del caso.</p>
      </article>
    `;

  dom.imageChecklist.innerHTML = buildImageChecklist(record)
    .map(
      (item) => `
        <article class="checklist-item ${item.ready ? "ready" : "pending"}">
          <span class="checklist-badge">${item.ready ? "Ready" : "Da rinforzare"}</span>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `
    )
    .join("");

  dom.geoStatus.textContent = geoIntel.status;
  dom.geoQueryCount.textContent = `${geoIntel.searches.length} query`;
  dom.geoInsights.innerHTML = geoIntel.cards
    .map(
      (card) => `
        <article class="saved-case-card">
          <span class="recommendation-badge">${escapeHtml(card.badge)}</span>
          <h4>${escapeHtml(card.title)}</h4>
          <p class="saved-case-meta">${escapeHtml(card.body)}</p>
        </article>
      `
    )
    .join("");
  renderQueryCards(dom.geoSearches, geoIntel.searches);
}

function renderReportsView(record, groupedSearches) {
  const payload = buildExportPayload(record);
  const evidenceCount = payload.evidenceBoard?.length || 0;
  const timelineCount = payload.timeline?.length || 0;
  const openTaskCount = (payload.tasks || []).filter((task) => task.status !== "done").length;

  dom.reportSummary.innerHTML = `
    <article class="recommendation-card">
      <span class="recommendation-badge">Exports</span>
      <h4>Report pronti</h4>
      <p>Il caso puo gia essere esportato in JSON, Markdown o PDF professionale c