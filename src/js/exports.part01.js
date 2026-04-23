(() => {
  const { parseTags, formatDate, formatBytes, escapeHtml, slugify, downloadFile, getSafeImageDataUrl } = window.OSINT_UTILS;
  const {
    buildSearches,
    buildSocialProfiles,
    buildGeoIntelligence,
    computeConfidenceScore,
    getSubjectLabel,
    groupSearchesByCategory,
  } = window.OSINT_SEARCHES;

  function buildExportPayload(record) {
    return {
      subject: getSubjectLabel(record),
      exportedAt: new Date().toISOString(),
      score: computeConfidenceScore(record),
      status: record.status,
      priority: record.priority,
      tags: parseTags(record.tags),
      fields: {
        caseName: record.caseName,
        name: record.name,
        surname: record.surname,
        username: record.username,
        email: record.email,
        phone: record.phone,
        location: record.location,
        notes: record.notes,
      },
      image: record.imageDataUrl
        ? {
            dataUrl: record.imageDataUrl,
            name: record.imageName,
            type: record.imageType,
            size: record.imageSize,
            updatedAt: record.imageUpdatedAt,
            analysisUpdatedAt: record.imageAnalysisUpdatedAt,
            exif: record.imageExif || null,
            ocr: record.imageOcr || null,
          }
        : null,
      searches: buildSearches(record),
      socialProfiles: buildSocialProfiles(record),
      geoIntelligence: buildGeoIntelligence(record),
      graphNodeLabels: buildGraphNodeLabels(record),
      graphRelationLabels: buildGraphRelationLabels(record),
      graphEntities: Array.isArray(record.graphEntities)
        ? [...record.graphEntities].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
        : [],
      graphRelations: Array.isArray(record.graphRelations)
        ? [...record.graphRelations].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
        : [],
      graphLayout: record.graphLayout || {},
      evidenceBoard: Array.isArray(record.evidenceBoard)
        ? [...record.evidenceBoard].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
        : [],
      timeline: Array.isArray(record.timeline) ? [...record.timeline].sort(compareTimelineEntries) : [],
      tasks: Array.isArray(record.tasks)
        ? [...record.tasks].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
        : [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  function exportJson(record) {
    const payload = buildExportPayload(record);
    downloadFile(
      `${slugify(getSubjectLabel(record)) || "osint-case"}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  }

  function exportReport(record) {
    const payload = buildExportPayload(record);
    const lines = [
      `# ${payload.subject}`,
      "",
      `- Esportato: ${formatDate(payload.exportedAt)}`,
      `- Stato: ${payload.status}`,
      `- Priorita: ${payload.priority}`,
      `- Accuratezza stimata: ${payload.score}%`,
      `- Query generate: ${payload.searches.length}`,
      `- Tag: ${payload.tags.join(", ") || "-"}`,
      `- Nodi manuali: ${payload.graphEntities.length}`,
      `- Relazioni grafo: ${payload.graphRelations.length}`,
      `- Evidenze: ${payload.evidenceBoard.length}`,
      `- Timeline: ${payload.timeline.length}`,
      `- Task: ${payload.tasks.length}`,
      "",
      "## Identificatori",
      "",
      `- Nome: ${payload.fields.name || "-"}`,
      `- Cognome: ${payload.fields.surname || "-"}`,
      `- Username: ${payload.fields.username || "-"}`,
      `- Email: ${payload.fields.email || "-"}`,
      `- Telefono: ${payload.fields.phone || "-"}`,
      `- Luogo: ${payload.fields.location || "-"}`,
      `- Immagine: ${payload.image?.name || "-"}`,
      `- OCR: ${payload.image?.ocr?.status || "-"}`,
      `- EXIF: ${payload.image?.exif?.available ? "disponibile" : "assente"}`,
      "",
      "## Note",
      "",
      payload.fields.notes || "Nessuna nota.",
      "",
      "## Image Intelligence",
      "",
      `- Ultima analisi immagine: ${formatDate(payload.image?.analysisUpdatedAt)}`,
      `- EXIF: ${payload.image?.exif?.summary || "-"}`,
      `- OCR blocchi: ${payload.image?.ocr?.lines?.length || 0}`,
      ...((payload.image?.ocr?.lines || []).map((line) => `- OCR: ${line.text}`)),
      "",
      "## Social Intelligence",
      "",
      ...payload.socialProfiles.map((profile) => `- ${profile.name}: ${profile.matchLabel} (${profile.confidence}%) | segnali: ${profile.signals.join(", ") || "-"}`),
      "",
      "## Geo Intelligence",
      "",
      `- Stato geo: ${payload.geoIntelligence.status}`,
      ...payload.geoIntelligence.cards.map((card) => `- ${card.badge}: ${card.title} - ${card.body}`),
      "",
      "## Grafo Manuale",
      "",
      ...(payload.graphEntities.length
        ? payload.graphEntities.map(
            (item) =>
              `- [${item.type}] ${item.label} | valore: ${item.value || "-"} | confidenza: ${item.confidence}`
          )
        : ["- Nessun nodo manuale."]),
      "",
      "## Relazioni Manuali",
      "",
      ...(payload.graphRelations.length
        ? payload.graphRelations.map(
            (item) =>
              `- ${getGraphNodeLabel(payload.graphNodeLabels, item.sourceId)} -> ${getGraphNodeLabel(payload.graphNodeLabels, item.targetId)} | relazione: ${item.label} | confidenza: ${item.confidence} | note: ${item.notes || "-"}`
          )
        : ["- Nessuna relazione manuale."]),
      "",
      "## Evidence Board",
      "",
      ...(payload.evidenceBoard.length
        ? payload.evidenceBoard.map(
            (item) =>
              `- [${item.type}] ${item.title} | stato: ${item.status} | confidenza: ${item.confidence} | fonte: ${item.source || "-"} | nodi: ${(item.linkedNodeIds || []).map((id) => getGraphNodeLabel(payload.graphNodeLabels, id)).join(", ") || "-"} | relazioni: ${(item.linkedRelationIds || []).map((id) => payload.graphRelationLabels[id] || id).join(", ") || "-"}`
          )
        : ["- Nessuna evidenza."]),
      "",
      "## Timeline",
      "",
      ...(payload.timeline.length
        ? payload.timeline.map(
            (item) =>
              `- ${item.date || "-"} ${item.time || ""} [${item.category}] ${item.title}: ${item.description || "-"}`
          )
        : ["- Nessun evento timeline."]),
      "",
      "## Task Operativi",
      "",
      ...(payload.tasks.length
        ? payload.tasks.map(
            (item) =>
              `- [${formatTaskStatusLabel(item.status)}] ${item.title} | priorita: ${formatTaskPriorityLabel(item.priority)} | scadenza: ${item.dueDate || "-"} | note: ${item.notes || "-"}`
          )
        : ["- Nessun task registrato."]),
      "",
      "## Query Pack",
      "",
      ...payload.searches.map((search) => `- [${search.category}] ${search.title}: ${search.query}`),
    ];

    downloadFile(
      `${slugify(getSubjectLabel(record)) || "osint-case"}-report.md`,
      lines.join("\n"),
      "text/markdown"
    );
  }

  function exportPdf(record) {
    const payload = buildExportPayload(record);
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      throw new Error("Popup blocked");
    }

    printWindow.document.open();
    printWindow.document.write(buildPdfDocument(payload));
    printWindow.document.close();
  }

  function buildPdfDocument(payload) {
    const groupedSearches = groupSearchesByCategory(payload.searches);
    const subject = escapeHtml(payload.subject);
    const caseName = escapeHtml(payload.fields.caseName || payload.subject);
    const notes = escapeHtml(payload.fields.notes || "Nessuna nota.");
    const safeImageDataUrl = getSafeImageDataUrl(payload.image?.dataUrl || "");
    const imageMarkup =
      payload.image && safeImageDataUrl
        ? `
          <section class="pdf-section">
            <div class="section-header">
              <h2>Immagine</h2>
            </div>
            <div class="image-panel">
              <img src="${safeImageDataUrl}" alt="Immagine del caso" />
              <div class="image-meta">
                <div class="meta-row"><span>File</span><strong>${escapeHtml(payload.image.name || "-")}</strong></div>
                <div class="meta-row"><span>Formato</span><strong>${escapeHtml(payload.image.type || "-")}</strong></div>
                <div class="meta-row"><span>Dimensione</span><strong>${escapeHtml(formatBytes(payload.image.size))}</strong></div>
                <div class="meta-row"><span>Ultimo update</span><strong>${escapeHtml(formatDate(payload.image.updatedAt))}</strong></div>
                <div class="meta-row"><span>Ultima analisi</span><strong>${escapeHtml(formatDate(payload.image.analysisUpdatedAt))}</strong></div>
              </div>
            </div>
          </section>
        `
        : "";

    return `
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <title>${caseName} - PDF Report</title>
    <style>
      :root {
        --ink: #0d1b29;
        --muted: #5a6a7b;
        --line: #d9e2ea;
        --accent: #0f766e;
        --accent-soft: #e8f7f4;
        --card: #f8fbfd;
      }

      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; color: var(--ink); font-family: "Segoe UI", Arial, sans-serif; background: #eef4f8; }
      body { padding: 28px; }
      .sheet { max-width: 1000px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe5ec; border-radius: 24px; overflow: hidden; }
      .hero { padding: 34px 36px 28px; background: linear-gradient(135deg, #0b1722, #13324a 54%, #155e63); color: #ffffff; }
      .eyebrow { margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.18em; font-size: 11px; opacity: 0.74; }
      h1, h2, h3, p { margin-top: 0; }
      h1 { margin-bottom: 10px; font-size: 34px; line-height: 1.08; }
      .hero-copy { max-width: 720px; }
      .hero-copy p:last-child { margin-bottom: 0; color: rgba(255, 255, 255, 0.82); line-height: 1.6; }
      .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 24px; }
      .metric { padding: 16px 18px; border-radius: 18px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.12); }
      .metric span { display: block; font-size: 12px; opacity: 0.76; }
      .metric strong { display: block; margin-top: 6px; font-size: 21px; }
      .content { padding: 28px 36px 36px; }
      .pdf-section { margin-top: 28px; }
      .pdf-section:first-child { margin-top: 0; }
      .section-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--line); margin-bottom: 16px; }
      .section-header h2 { margin-bottom: 0; font-size: 20px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .card { padding: 16px 18px; border-radius: 18px; background: var(--card); border: 1px solid var(--line); }
      .card span { display: block; color: var(--muted); font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.08em; }
      .card strong { display: block; font-size: 16px; line-height: 1.5; }
      .notes-box { padding: 18px 20px; border-radius: 18px; background: #fbfdff; border: 1px solid var(--line); white-space: pre-wrap; line-height: 1.7; }
      .query-group { margin-top: 18px; }
      .query-group:first-child { margin-top: 0; }
      .query-group h3 { margin-bottom: 10px; color: var(--accent); font-size: 16px; }
      .query-item { padding: 14px 16px; border-radius: 16px; background: #ffffff; border: 1px solid var(--line); margin-top: 10px; page-break-inside: avoid; }
      .query-item:first-child { margin-top: 0; }
      .query-topline { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    