ero(record, score, searches.length);
  renderViewState();
  renderGraph(dom.graphCanvas, record, {
    onNodeSelect: (field) => {
      updateCurrentCase({ graphFocusId: field }, { persist: true, touch: false });
    },
    onNodeMove: (nodeId, position) => {
      updateCurrentCase(
        {
          graphLayout: {
            ...(record.graphLayout || {}),
            [nodeId]: position,
          },
        },
        { persist: true, touch: false }
      );
    },
  });
  renderFocusBanner(activeGraphNode);
  renderGraphStudio(record, graphNodeOptions);
  renderEvidenceLinkSelectors(record, graphNodeOptions);
  renderQueryCards(dom.queryPacks, filteredSearches);
  dom.queryCount.textContent = `${searches.length} query`;
  renderRecommendationsPanel(record, score, searches.length);
  renderCaseArchive(dom.dashboardCaseArchive, state.cases.slice(0, 4));
  dom.caseCountLabel.textContent = `${state.cases.length} casi`;

  dom.socialQueryCount.textContent = `${socialSearches.length} query`;
  renderSocialProfiles(socialProfiles);
  renderQueryCards(dom.socialSearches, socialSearches);

  renderImagePanel(record);
  renderImageIntel(record, geoIntel);
  renderReportsView(record, groupedSearches);
  renderCasesView(record);
}

function renderHero(record, score, searchCount) {
  dom.subjectLabel.textContent = getSubjectLabel(record);
  dom.caseSummary.textContent = getCaseSummary(record, score, searchCount);
  dom.scoreValue.textContent = `${score}%`;
  dom.scoreFill.style.width = `${score}%`;
  const graphEntityCount = record.graphEntities?.length || 0;
  const graphRelationCount = record.graphRelations?.length || 0;
  const openTaskCount = (record.tasks || []).filter((task) => task.status !== "done").length;

  const tags = parseTags(record.tags);
  const caseMeta = [
    `<span class="hero-chip">Stato: ${escapeHtml(record.status || "active")}</span>`,
    `<span class="hero-chip">Priorita: ${escapeHtml(record.priority || "medium")}</span>`,
    `<span class="hero-chip">Aggiornato: ${escapeHtml(formatDate(record.updatedAt))}</span>`,
  ];

  if (tags.length) {
    tags.slice(0, 4).forEach((tag) => {
      caseMeta.push(`<span class="hero-chip">#${escapeHtml(tag)}</span>`);
    });
  }

  dom.caseMetaChips.innerHTML = caseMeta.join("");
  dom.coverageChips.innerHTML = buildCoverageItems(record, score, searchCount)
    .map((item) => `<span class="hero-chip">${escapeHtml(item)}</span>`)
    .join("");

  dom.metricCards.innerHTML = `
    <div class="metric-card">
      <span>Casi archiviati</span>
      <strong>${state.cases.length}</strong>
    </div>
    <div class="metric-card">
      <span>Grafo manuale</span>
      <strong>${graphEntityCount} nodi</strong>
    </div>
    <div class="metric-card">
      <span>Relazioni</span>
      <strong>${graphRelationCount} legami</strong>
    </div>
    <div class="metric-card">
      <span>Evidence board</span>
      <strong>${record.evidenceBoard?.length || 0} evidenze</strong>
    </div>
    <div class="metric-card">
      <span>Timeline</span>
      <strong>${record.timeline?.length || 0} eventi</strong>
    </div>
    <div class="metric-card">
      <span>Task operativi</span>
      <strong>${openTaskCount} aperti</strong>
    </div>
  `;
}

function renderViewState() {
  Object.entries(dom.viewPanels).forEach(([viewId, panel]) => {
    panel.classList.toggle("active", state.currentView === viewId);
  });

  dom.viewTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.currentView);
  });
}

function renderFocusBanner(activeGraphNode) {
  if (!activeGraphNode) {
    dom.activeFocusBanner.classList.add("hidden");
    dom.activeFocusBanner.textContent = "";
    return;
  }

  dom.activeFocusBanner.classList.remove("hidden");
  if (activeGraphNode.filterField) {
    dom.activeFocusBanner.textContent = `Filtro attivo: ${activeGraphNode.label}. Mostro solo le query collegate a questo nodo.`;
    return;
  }

  dom.activeFocusBanner.textContent = `Nodo attivo: ${activeGraphNode.label}. Sto evidenziando il grafo manuale senza filtrare le query automatiche.`;
}

function getGraphNodeOptions(record) {
  const options = [
    {
      id: "subject",
      label: getSubjectLabel(record),
      filterField: "",
      kind: "subject",
    },
  ];

  Object.keys(FIELD_LABELS).forEach((field) => {
    if (!record[field]) {
      return;
    }

    options.push({
      id: `field:${field}`,
      label:
        field === "imageDataUrl"
          ? `${FIELD_LABELS[field]}: ${truncate(record.imageName || "Immagine collegata", 28)}`
          : `${FIELD_LABELS[field]}: ${truncate(record[field], 28)}`,
      filterField: field,
      kind: "field",
    });
  });

  (record.graphEntities || []).forEach((entity) => {
    options.push({
      id: entity.id,
      label: `${entity.label} (${getGraphEntityTypeLabel(entity.type)})`,
      filterField: "",
      kind: "manual",
    });
  });

  return options;
}

function getGraphEntityTypeLabel(type) {
  return GRAPH_ENTITY_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || "Nodo";
}

function populateGraphNodeSelect(select, options, preferredValue = "") {
  const currentValue = preferredValue || select.value;

  select.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`)
    .join("");

  const fallbackValue = select === dom.graphSourceNode ? "subject" : options.find((option) => option.id !== "subject")?.id || "subject";
  const nextValue = options.some((option) => option.id === currentValue) ? currentValue : fallbackValue;

  select.value = nextValue;
}

function renderGraphStudio(record, graphNodeOptions) {
  const graphEntities = [...(record.graphEntities || [])].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  const graphRelations = [...(record.graphRelations || [])].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  const graphLookup = new Map(graphNodeOptions.map((option) => [option.id, option.label]));
  const entityEditId = dom.graphEntityForm.querySelector('[name="entityId"]').value;
  const relationEditId = dom.graphRelationForm.querySelector('[name="relationId"]').value;
  const relationBeingEdited = graphRelations.find((entry) => entry.id === relationEditId);

  if (entityEditId && !graphEntities.some((entry) => entry.id === entityEditId)) {
    resetGraphEntityForm();
  }
  if (relationEditId && !graphRelations.some((entry) => entry.id === relationEditId)) {
    resetGraphRelationForm();
  }

  dom.graphEntityCount.textContent = `${graphEntities.length} nodi`;
  dom.graphRelationCount.textContent = `${graphRelations.length} relazioni`;
  populateGraphNodeSelect(
    dom.graphSourceNode,
    graphNodeOptions,
    relationBeingEdited?.sourceId || dom.graphSourceNode.value
  );
  populateGraphNodeSelect(
    dom.graphTargetNode,
    graphNodeOptions,
    relationBeingEdited?.targetId || dom.graphTargetNode.value
  );
  const relationAvailable = graphNodeOptions.length > 1;
  dom.graphSourceNode.disabled = !relationAvailable;
  dom.graphTargetNode.disabled = !relationAvailable;
  dom.graphRelationSubmitButton.disabled = !relationAvailable;
  dom.graphDragHint.textContent = Object.keys(record.graphLayout || {}).length
    ? "Cluster mode attivo: il layout personalizzato del grafo viene salvato nel caso corrente."
    : "Cluster mode attivo: il reset ridistribuisce identita, footprint e segnali manuali in gruppi visivi automatici.";

  dom.graphEntitiesList.innerHTML = graphEntities.length
    ? graphEntities
        .map((entity) => {
          const linkedRelations = graphRelations.filter(
            (relation) => relation.sourceId === entity.id || relation.targetId === entity.id
          ).length;

          return `
            <article class="saved-case-card">
              <div class="saved-case-header">
                <div>
                  <div class="case-title-row">
                    <h4>${escapeHtml(entity.label || "Nodo manuale")}</h4>
                    <span class="case-pill">${escapeHtml(getGraphEntityTypeLabel(entity.type))}</span>
                  </div>
                  <p class="saved-case-meta">Aggiornato il ${escapeHtml(formatDate(entity.updatedAt))}</p>
                </div>
                <span class="case-pill">${escapeHtml(entity.confidence || "medium")}</span>
              </div>
              <div class="graph-card-meta">Valore: ${escapeHtml(entity.value || "-")} / Relazioni: ${linkedRelations}</div>
              <p class="saved-case-meta">${escapeHtml(entity.notes || "Nessuna nota operativa per questo nodo.")}</p>
              <div class="saved-case-actions">
                <button class="button button-secondary small" type="button" data-edit-entity="${entity.id}">Modifica</button>
                <button class="button button-ghost small" type="button" data-delete-entity="${entity.id}">Elimina</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `
      <article class="saved-case-card">
        <h4>Nessun nodo manuale</h4>
        <p class="saved-case-meta">Aggiungi alias, luoghi, contatti o documenti per far crescere il grafo oltre i soli campi del form.</p>
      </article>
    `;

  dom.graphRelationsList.innerHTML = graphRelations.length
    ? graphRelations
        .map((relation) => {
          const sourceLabel = graphLookup.get(relation.sourceId)?.label || relation.sourceId;
          const targetLabel = graphLookup.get(relation.targetId)?.label || relation.targetId;

          return `
            <article class="saved-case-card">
              <div class="saved-case-header">
                <div>
                  <div class="case-title-row">
                    <h4>${escapeHtml(relation.label || "Relazione")}</h4>
                    <span class="case-pill">${escapeHtml(relation.confidence || "medium")}</span>
                  </div>
                  <p class="saved-case-meta">Aggiornata il ${escapeHtml(formatDate(relation.updatedAt))}</p>
                </div>
              </div>
              <div class="graph-relationship">
                <span>${escapeHtml(sourceLabel)}</span>
                <span class="graph-arrow">-></span>
                <span>${escapeHtml(targetLabel)}</span>
              </div>
              <p class="saved-case-meta">${escapeHtml(relation.notes || "Nessuna nota operativa per questa relazione.")}</p>
              <div class="saved-case-actions">
                <button class="button button-secondary small" type="button" data-edit-relation="${relation.id}">Modifica</button>
                <button class="button button-ghost small" type="button" data-delete-relation="${relation.id}">Elimina</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `
      <article class="saved-case-card">
        <h4>Nessuna relazione manuale</h4>
        <p class="saved-case-meta">Collega i nodi del caso per dichiarare alias, appartenenze, riferimenti geografici e altri legami verificati.</p>
      </article>
    `;
}

function renderEvidenceLinkSelectors(record, graphNodeOptions) {
  const relations = [...(record.graphRelations || [])].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  const graphLookup = new Map(graphNodeOptions.map((option) => [option.id, option.label]));

  dom.evidenceLinkedNodes.innerHTML = graphNodeOptions.length
    ? graphNodeOptions
        .map(
          (option) => `
            <label class="selection-chip">
              <input type="checkbox" value="${escapeHtml(option.id)}" />
              <span>${escapeHtml(option.label)}</span>
            </label>
          `
        )
        .join("")
    : `<p class="saved-case-meta">Nessun nodo disponibile per il collegamento.</p>`;

  dom.evidenceLinkedRelations.innerHTML = relations.length
    ? relations
        .map(
          (relation) => `
      