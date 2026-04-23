on stato, priorita, tag, social intelligence, grafo manuale, evidenze, timeline e query raggruppate.</p>
    </article>
    <article class="recommendation-card">
      <span class="recommendation-badge">Case metadata</span>
      <h4>${escapeHtml(payload.status)} / ${escapeHtml(payload.priority)}</h4>
      <p>Tag attivi: ${escapeHtml(payload.tags.join(", ") || "nessuno")}. Ultimo aggiornamento: ${escapeHtml(formatDate(payload.updatedAt))}.</p>
    </article>
    <article class="recommendation-card">
      <span class="recommendation-badge">Coverage</span>
      <h4>${payload.searches.length} query in report</h4>
      <p>Accuratezza stimata ${payload.score}% con ${payload.socialProfiles.length} profili social, ${payload.graphEntities.length} nodi manuali, ${payload.graphRelations.length} relazioni, ${evidenceCount} evidenze, ${timelineCount} eventi timeline e ${openTaskCount} task aperti.</p>
    </article>
  `;

  dom.reportCategoryCount.textContent = `${groupedSearches.length} sezioni`;
  dom.reportCategories.innerHTML = groupedSearches
    .map(
      ([category, items]) => `
        <article class="saved-case-card">
          <h4>${escapeHtml(category)}</h4>
          <p class="saved-case-meta">${items.length} elementi inclusi nel report.</p>
          <div class="case-meta-row">${items.slice(0, 3).map((item) => escapeHtml(item.title)).join(" / ")}</div>
        </article>
      `
    )
    .join("");

  dom.evidenceCount.textContent = `${evidenceCount} evidenze`;
  dom.timelineCount.textContent = `${timelineCount} eventi`;
  renderEvidenceBoard(record);
  renderTimelineBoard(record);
}

function renderEvidenceBoard(record) {
  const items = [...(record.evidenceBoard || [])].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  const graphLookup = new Map(getGraphNodeOptions(record).map((option) => [option.id, option.label]));
  const relationLookup = new Map(
    (record.graphRelations || []).map((relation) => [
      relation.id,
      `${graphLookup.get(relation.sourceId) || relation.sourceId} -> ${graphLookup.get(relation.targetId) || relation.targetId}`,
    ])
  );

  if (!items.length) {
    dom.evidenceBoard.innerHTML = `
      <article class="saved-case-card">
        <h4>Nessuna evidenza raccolta</h4>
        <p class="saved-case-meta">Aggiungi fonti, link, note e livello di confidenza per trasformare il caso in un dossier verificabile.</p>
      </article>
    `;
    return;
  }

  dom.evidenceBoard.innerHTML = items
    .map(
      (entry) => `
        <article class="saved-case-card evidence-card">
          <div class="saved-case-header">
            <div>
              <div class="case-title-row">
                <h4>${escapeHtml(entry.title)}</h4>
                <span class="case-pill">${escapeHtml(entry.type)}</span>
              </div>
              <p class="saved-case-meta">Aggiornata il ${escapeHtml(formatDate(entry.updatedAt))}</p>
            </div>
            <span class="case-pill">${escapeHtml(entry.status)}</span>
          </div>
          <div class="case-meta-row">Confidenza ${escapeHtml(entry.confidence)} / Fonte ${escapeHtml(entry.source || "-")}</div>
          ${renderEvidenceLinkSummary(entry, graphLookup, relationLookup)}
          <p class="saved-case-meta">${escapeHtml(entry.notes || "Nessuna nota operativa.")}</p>
          ${
            entry.url
              ? `<div class="saved-case-actions"><button class="button button-secondary small" type="button" data-open-url="${escapeHtml(entry.url)}">Apri fonte</button>${entry.linkedNodeIds?.[0] ? `<button class="button button-ghost small" type="button" data-focus-node="${escapeHtml(entry.linkedNodeIds[0])}">Focus grafo</button>` : ""}<button class="button button-ghost small" type="button" data-delete-evidence="${entry.id}">Elimina</button></div>`
              : `<div class="saved-case-actions">${entry.linkedNodeIds?.[0] ? `<button class="button button-ghost small" type="button" data-focus-node="${escapeHtml(entry.linkedNodeIds[0])}">Focus grafo</button>` : ""}<button class="button button-ghost small" type="button" data-delete-evidence="${entry.id}">Elimina</button></div>`
          }
        </article>
      `
    )
    .join("");
}

function renderTimelineBoard(record) {
  const items = [...(record.timeline || [])].sort(compareTimelineEntries);

  if (!items.length) {
    dom.timelineBoard.innerHTML = `
      <article class="saved-case-card">
        <h4>Nessun evento timeline</h4>
        <p class="saved-case-meta">Aggiungi finding, verifiche e attivita per costruire la cronologia dell'indagine.</p>
      </article>
    `;
    return;
  }

  dom.timelineBoard.innerHTML = items
    .map(
      (entry) => `
        <article class="saved-case-card timeline-card">
          <div class="saved-case-header">
            <div>
              <div class="case-title-row">
                <h4>${escapeHtml(entry.title)}</h4>
                <span class="case-pill">${escapeHtml(entry.category)}</span>
              </div>
              <p class="saved-case-meta">${escapeHtml(formatTimelineStamp(entry))}</p>
            </div>
            <button class="button button-ghost small" type="button" data-delete-timeline="${entry.id}">Elimina</button>
          </div>
          <p class="saved-case-meta">${escapeHtml(entry.description || "Nessuna descrizione evento.")}</p>
        </article>
      `
    )
    .join("");
}

function compareTimelineEntries(left, right) {
  return new Date(buildTimelineSortKey(left)) - new Date(buildTimelineSortKey(right));
}

function buildTimelineSortKey(entry) {
  const date = entry.date || new Date().toISOString().slice(0, 10);
  const time = entry.time || "00:00";
  return `${date}T${time}:00`;
}

function formatTimelineStamp(entry) {
  const date = entry.date ? formatDate(`${entry.date}T${entry.time || "00:00"}:00`) : formatDate(entry.createdAt);
  return date;
}

function renderCasesView(record) {
  const filteredCases = getFilteredCases();
  const openTaskCount = (record.tasks || []).filter((task) => task.status !== "done").length;

  dom.caseVaultCount.textContent = `${filteredCases.length}/${state.cases.length} casi`;
  renderCaseArchive(dom.caseArchive, filteredCases, {
    emptyTitle: "Nessun caso corrispondente",
    emptyBody: "Prova a cambiare ricerca o filtri per trovare il dossier giusto.",
  });

  const tags = parseTags(record.tags);
  const signalCount = Object.keys(FIELD_LABELS).filter((key) => Boolean(record[key])).length;

  dom.caseDetail.innerHTML = `
    <article class="saved-case-card case-card-active">
      <div class="saved-case-header">
        <div>
          <h4>${escapeHtml(getSubjectLabel(record))}</h4>
          <p class="saved-case-meta">Creato il ${escapeHtml(formatDate(record.createdAt))}</p>
        </div>
        <span class="case-pill">${escapeHtml(record.status)}</span>
      </div>
      <div class="case-meta-row">Priorita ${escapeHtml(record.priority)} / ${signalCount} segnali</div>
      <div class="case-meta-row">${record.graphEntities?.length || 0} nodi manuali / ${record.graphRelations?.length || 0} relazioni</div>
      <div class="case-meta-row">${record.evidenceBoard?.length || 0} evidenze / ${record.timeline?.length || 0} eventi timeline</div>
      <div class="case-meta-row">${openTaskCount} task aperti / ${(record.tasks || []).length} task totali</div>
      <div class="case-meta-row">${tags.length ? tags.map((tag) => `#${escapeHtml(tag)}`).join(" ") : "Nessun tag assegnato"}</div>
      <div class="saved-case-card">
        <h4>Identificatori principali</h4>
        <p class="saved-case-meta">
          ${escapeHtml(record.name || "-")} ${escapeHtml(record.surname || "")} /
          ${escapeHtml(record.username || "-")} /
          ${escapeHtml(record.email || "-")}
        </p>
      </div>
      <div class="saved-case-card">
        <h4>Note operative</h4>
        <p class="saved-case-meta">${escapeHtml(record.notes || "Nessuna nota operativa inserita.")}</p>
      </div>
    </article>
  `;

  dom.taskCount.textContent = `${(record.tasks || []).length} task`;
  renderTaskBoard(record);
}

function renderMetaCard(label, value) {
  return `
    <div class="meta-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function formatTaskStatusLabel(status) {
  return (
    {
      todo: "Da fare",
      "in-progress": "In corso",
      done: "Completata",
      blocked: "Bloccata",
    }[status] || status || "Da fare"
  );
}

function formatTaskPriorityLabel(priority) {
  return (
    {
      low: "Bassa",
      medium: "Media",
      high: "Alta",
      critical: "Critica",
    }[priority] || priority || "Media"
  );
}

function renderEvidenceLinkSummary(entry, graphLookup, relationLookup) {
  const nodeLabels = (entry.linkedNodeIds || []).map((id) => graphLookup.get(id) || id);
  const relationLabels = (entry.linkedRelationIds || []).map((id) => relationLookup.get(id) || id);
  const chips = [
    ...nodeLabels.map((label) => `<span class="hero-chip compact-chip">${escapeHtml(label)}</span>`),
    ...relationLabels.map((label) => `<span class="hero-chip compact-chip">${escapeHtml(label)}</span>`),
  ];

  if (!chips.length) {
    return "";
  }

  return `<div class="case-meta-row">${chips.join("")}</div>`;
}

function getFilteredCases() {
  return state.cases.filter((record) => {
    const haystack = [
      getSubjectLabel(record),
      record.caseName,
      record.name,
      record.surname,
      record.username,
      record.email,
      record.phone,
      record.location,
      record.tags,
      record.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesQuery = !state.caseFilters.query || haystack.includes(state.caseFilters.query);
    const matchesStatus = state.caseFilters.status === "all" || record.status === state.caseFilters.status;
    const matchesPriority = state.caseFilters.priority === "all" || record.priority === state.caseFilters.priority;

    return matchesQuery && matchesStatus && matchesPriority;
  });
}

function renderTaskBoard(record) {
  const tasks = [...(record.tasks || [])].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));

  if (!tasks.length) {
    dom.taskBoard.innerHTML = `
      <article class="saved-case-card">
        <h4>Nessun task operativo</h4>
        <p class="saved-case-meta">Aggiungi una checklist per mantenere verifiche, follow-up e blocchi del caso sotto controllo.</p>
      </article>
    `;
    return;
  }

  dom.taskBoard.innerHTML = tasks
    .map(
      (task) => `
        <article class="saved-case-card task-card task-${escapeHtml(task.status || "todo")}">
          <div class="saved-case-header">
            <div>
              <div class="case-title-row">
                <h4>${escapeHtml(task.title)}</h4>
                <span class="case-pill">${escapeHtml(formatTaskStatusLabel(task.status))}</span>
              </div>
              <p class="saved-case-meta">Aggiornato il ${escapeHtml(formatDate(task.updatedAt))}</p>
            </div>
            <span class="case-pill">${escapeHtml(formatTaskPriorityLabel(task.priority))}</span>
          </div>
          <div class="case-meta-row">
            <span>Scadenza ${escapeHtml(task.dueDate || "-")}</span>
            <span>${escapeHtml(task.notes || "Nessuna nota task")}</span>
          </div>
          <div class="saved-case-actions">
            <button class="button button-secondary small" type="button" data-cycle-task="${task.id}">Cambia stato</button>
            <button class="button button-ghost small" type="button" data-delete-task="${task.id}">Elimina</button>
          </div>
        </article>
      `
    )
    .join("");
}

function handleExport(kind) {
  const record = getCurrentCase();
  if (!record) {
    return;
  }

  try {
    if (kind === "json") {
      exportJson(record);
      showToast("Esportazione JSON pronta.");
      return;
    }