  .query-topline strong { display: block; font-size: 15px; }
      .tag { white-space: nowrap; padding: 5px 9px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; border: 1px solid #ccebe6; }
      .query-description { margin: 10px 0 0; color: var(--muted); line-height: 1.6; }
      .query-code { margin-top: 12px; padding: 12px 14px; border-radius: 14px; background: #f3f7fa; border: 1px solid #dfe8ef; white-space: pre-wrap; word-break: break-word; font-family: Consolas, "Courier New", monospace; font-size: 12px; line-height: 1.6; }
      .image-panel { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr); gap: 18px; align-items: start; }
      .image-panel img { width: 100%; max-height: 360px; object-fit: cover; border-radius: 18px; border: 1px solid var(--line); }
      .image-meta { display: grid; gap: 12px; }
      .meta-row { padding: 14px 16px; border-radius: 16px; background: var(--card); border: 1px solid var(--line); }
      .meta-row span { display: block; color: var(--muted); font-size: 12px; margin-bottom: 6px; }
      .meta-row strong { display: block; font-size: 15px; }
      .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; line-height: 1.6; }
      @media print {
        body { background: #ffffff; padding: 0; }
        .sheet { max-width: none; border: 0; border-radius: 0; }
        .query-item, .card, .meta-row, .notes-box { break-inside: avoid; }
      }
      @page { size: A4; margin: 14mm; }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">OSINT Control Center</p>
          <h1>${subject}</h1>
          <p>Report operativo esportato il ${escapeHtml(formatDate(payload.exportedAt))}. Questa sintesi raccoglie gestione del caso, identificatori, segnali sociali e query OSINT generate nel workspace.</p>
        </div>
        <div class="metrics">
          <div class="metric"><span>Accuratezza stimata</span><strong>${escapeHtml(String(payload.score))}%</strong></div>
          <div class="metric"><span>Query generate</span><strong>${escapeHtml(String(payload.searches.length))}</strong></div>
          <div class="metric"><span>Stato</span><strong>${escapeHtml(payload.status)}</strong></div>
          <div class="metric"><span>Priorita</span><strong>${escapeHtml(payload.priority)}</strong></div>
        </div>
      </section>
      <section class="content">
        <section class="pdf-section">
          <div class="section-header"><h2>Gestione caso</h2></div>
          <div class="grid three">
            ${renderPdfFieldCard("Nome caso", payload.fields.caseName || payload.subject)}
            ${renderPdfFieldCard("Creato", formatDate(payload.createdAt))}
            ${renderPdfFieldCard("Aggiornato", formatDate(payload.updatedAt))}
          </div>
          <div class="grid three" style="margin-top:14px;">
            ${renderPdfFieldCard("Stato", payload.status)}
            ${renderPdfFieldCard("Priorita", payload.priority)}
            ${renderPdfFieldCard("Tag", payload.tags.join(", ") || "-")}
          </div>
          <div class="grid three" style="margin-top:14px;">
            ${renderPdfFieldCard("Nodi manuali", String(payload.graphEntities.length))}
            ${renderPdfFieldCard("Relazioni", String(payload.graphRelations.length))}
            ${renderPdfFieldCard("Evidence board", String(payload.evidenceBoard.length))}
          </div>
          <div class="grid three" style="margin-top:14px;">
            ${renderPdfFieldCard("Timeline", String(payload.timeline.length))}
            ${renderPdfFieldCard("Query pack", String(payload.searches.length))}
            ${renderPdfFieldCard("Accuratezza", `${payload.score}%`)}
          </div>
        </section>
        <section class="pdf-section">
          <div class="section-header"><h2>Identificatori</h2></div>
          <div class="grid">
            ${renderPdfFieldCard("Nome", payload.fields.name)}
            ${renderPdfFieldCard("Cognome", payload.fields.surname)}
            ${renderPdfFieldCard("Username", payload.fields.username)}
            ${renderPdfFieldCard("Email", payload.fields.email)}
            ${renderPdfFieldCard("Telefono", payload.fields.phone)}
            ${renderPdfFieldCard("Luogo", payload.fields.location)}
          </div>
        </section>
        ${imageMarkup}
        <section class="pdf-section">
          <div class="section-header"><h2>Image Intelligence</h2></div>
          <div class="grid">
            ${renderPdfFieldCard("EXIF", payload.image?.exif?.summary || "Nessun metadato disponibile")}
            ${renderPdfFieldCard("OCR stato", payload.image?.ocr?.status || "-")}
            ${renderPdfFieldCard("OCR blocchi", String(payload.image?.ocr?.lines?.length || 0))}
            ${renderPdfFieldCard("Coordinate", payload.image?.exif?.gps?.coordinates || "-")}
          </div>
          <div class="notes-box" style="margin-top:14px;">${escapeHtml(
            payload.image?.ocr?.fullText || "Nessun testo OCR disponibile nel caso corrente."
          )}</div>
        </section>
        <section class="pdf-section">
          <div class="section-header"><h2>Social Intelligence</h2></div>
          <div class="grid three">
            ${payload.socialProfiles.map((profile) => renderPdfFieldCard(profile.name, `${profile.matchLabel} (${profile.confidence}%) / ${profile.signals.join(", ") || "-"}`)).join("")}
          </div>
        </section>
        <section class="pdf-section">
          <div class="section-header"><h2>Geo Intelligence</h2></div>
          <div class="grid">
            ${renderPdfFieldCard("Stato geo", payload.geoIntelligence.status)}
            ${renderPdfFieldCard("Geo query", String(payload.geoIntelligence.searches.length))}
            ${payload.geoIntelligence.cards.map((card) => renderPdfFieldCard(card.badge, `${card.title}`)).join("")}
          </div>
        </section>
        <section class="pdf-section">
          <div class="section-header"><h2>Grafo Manuale</h2></div>
          ${renderPdfGraphEntities(payload.graphEntities)}
        </section>
        <section class="pdf-section">
          <div class="section-header"><h2>Relazioni Manuali</h2></div>
          ${renderPdfGraphRelations(payload.graphRelations, payload.graphNodeLabels)}
        </section>
        <section class="pdf-section">
          <div class="section-header"><h2>Evidence Board</h2></div>
          ${renderPdfEvidenceList(payload.evidenceBoard, payload.graphNodeLabels, payload.graphRelationLabels)}
        </section>
        <section class="pdf-section">
          <div class="section-header"><h2>Timeline</h2></div>
          ${renderPdfTimelineList(payload.timeline)}
        </section>
        <section class="pdf-section">
          <div class="section-header"><h2>Task Operativi</h2></div>
          ${renderPdfTaskList(payload.tasks)}
        </section>
        <section class="pdf-section">
          <div class="section-header"><h2>Note operative</h2></div>
          <div class="notes-box">${notes}</div>
        </section>
        <section class="pdf-section">
          <div class="section-header"><h2>Pack di query</h2></div>
          ${renderPdfQueryGroups(groupedSearches)}
        </section>
        <div class="footer">
          Uso consigliato su fonti pubbliche e contesti legittimi. Verifica sempre policy, contesto operativo e attendibilita dei risultati raccolti.
        </div>
      </section>
    </main>
    <script>
      window.addEventListener("load", () => {
        window.setTimeout(() => { window.print(); }, 250);
      });
    </script>
  </body>
</html>
    `;
  }

  function renderPdfFieldCard(label, value) {
    return `
      <div class="card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value || "-")}</strong>
      </div>
    `;
  }

  function renderPdfQueryGroups(groupedSearches) {
    if (!groupedSearches.length) {
      return `<div class="notes-box">Nessuna query disponibile per il caso corrente.</div>`;
    }

    return groupedSearches
      .map(
        ([category, searches]) => `
          <section class="query-group">
            <h3>${escapeHtml(category)}</h3>
            ${searches
              .map(
                (search) => `
                  <article class="query-item">
                    <div class="query-topline">
                      <strong>${escapeHtml(search.title)}</strong>
                      <span class="tag">${escapeHtml(search.tag)}</span>
                    </div>
                    <p class="query-description">${escapeHtml(search.description)}</p>
                    <div class="query-code">${escapeHtml(search.query)}</div>
                  </article>
                `
              )
              .join("")}
          </section>
        `
      )
      .join("");
  }

  function renderPdfEvidenceList(evidenceBoard, graphNodeLabels, graphRelationLabels) {
    if (!evidenceBoard.length) {
      return `<div class="notes-box">Nessuna evidenza registrata nel caso corrente.</div>`;
    }

    return evidenceBoard
      .map(
        (item) => `
          <article class="query-item">
            <div class="query-topline">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="tag">${escapeHtml(item.type)}</span>
            </div>
            <p class="query-description">Stato: ${escapeHtml(item.status)} / Confidenza: ${escapeHtml(item.confidence)} / Fonte: ${escapeHtml(item.source || "-")}</p>
            <div class="query-code">${escapeHtml(item.notes || item.url || "Nessuna nota.")}</div>
            <p class="query-description">Nodi: ${escapeHtml((item.linkedNodeIds || []).map((id) => getGraphNodeLabel(graphNodeLabels, id)).join(", ") || "-")} / Relazioni: ${escapeHtml((item.linkedRelationIds || []).map((id) => graphRelationLabels[id] || id).join(", ") || "-")}</p>
          </article>
        `
      )
      .join("");
  }

  function renderPdfGraphEntities(graphEntities) {
    if (!graphEntities.length) {
      return `<div class="notes-box">Nessun nodo manuale registrato nel grafo del caso.</div>`;
    }

    return graphEntities
      .map(
        (item) => `
          <article class="query-item">
            <div class="query-topline">
              <strong>${escapeHtml(item.label || "-")}</strong>
              <span class="tag">${escapeHtml(item.type)}</span>
            </div>
            <p class="query-description">Confidenza: ${escapeHtml(item.confidence)} / Valore: ${escapeHtml(item.value || "-")}</p>
            <div class="query-code">${escapeHtml(item.notes || "Nessuna nota.")}</div>
          </article>
        `
      )
      .join("");
  }

  function renderPdfGraphRelations(graphRelations, graphNodeLabels) {
    if (!graphRelations.length) {
      return `<div class="notes-box">Nessuna relazione manuale registrata nel grafo del caso.</div>`;
    }

    return graphRelations
      .map(
        (item) => `
          <article class="query-item">
            <div class="query-topline">
              <strong>${escapeHtml(item.label || "relazione")}</strong>
              <span class="tag">${escapeHtml(item.confidence)}</span>
            </div>
            <p class="query-description">${escapeHtml(getGraphNodeLabel(graphNodeLabels, item.sourceId))} -> ${escapeHtml(getGraphNodeLabel(graphNodeLabels, item.targetId))}</p>
            <div class="query-code">${escapeHtml(item.notes || "Nessuna nota.")}</div>
          </article>
        `
      )
      .join("");
  }

  function buildGraphNodeLabels(record) {
    const labels = {
      subject: getSubjectLabel(record),
    };

    const fieldLabels = {
      name: "Nome",
      surname: "Cognome",
      username: "Username",
      email: "Email",
      phone: "Telefono",
      location: "Luog