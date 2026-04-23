denceInput) {
    entityConfidenceInput.value = "medium";
  }

  dom.graphEntitySubmitButton.textContent = "Salva nodo";
}

function resetGraphRelationForm() {
  dom.graphRelationForm.reset();
  const relationIdInput = dom.graphRelationForm.querySelector('[name="relationId"]');
  const relationConfidenceInput = dom.graphRelationForm.querySelector('[name="confidence"]');
  const relationLabelInput = dom.graphRelationForm.querySelector('[name="label"]');

  if (relationIdInput) {
    relationIdInput.value = "";
  }
  if (relationConfidenceInput) {
    relationConfidenceInput.value = "medium";
  }
  if (relationLabelInput) {
    relationLabelInput.value = "";
  }

  dom.graphRelationSubmitButton.textContent = "Salva relazione";
}

function resetEvidenceLinkSelections() {
  dom.evidenceLinkedNodes.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
  dom.evidenceLinkedRelations.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
}

function updateCurrentCase(updates, options = {}) {
  const { persist = false, touch = true, toastMessage = "" } = options;
  const current = getCurrentCase();

  if (!current) {
    return;
  }

  const nextCase = {
    ...current,
    ...updates,
    updatedAt: touch ? new Date().toISOString() : current.updatedAt,
  };

  upsertCaseInState(nextCase);
  render();

  if (persist) {
    queuePersist(nextCase, toastMessage);
  }
}

function queuePersist(record, toastMessage = "") {
  state.persistQueue = state.persistQueue
    .then(async () => {
      await putCase(record);
      if (toastMessage) {
        showToast(toastMessage);
      }
    })
    .catch((error) => {
      console.error(error);
      showToast("Errore nel salvataggio del caso.");
    });

  return state.persistQueue;
}

async function persistCurrentCase(toastMessage = "") {
  const record = getCurrentCase();
  if (!record) {
    return;
  }

  await queuePersist(record, toastMessage);
}

async function switchCase(id) {
  if (!state.cases.some((record) => record.id === id)) {
    return;
  }

  await persistCurrentCase();
  state.currentCaseId = id;
  await setAppState("selectedCaseId", id);
  syncInputsFromCase();
  render();
}

async function createNewCase() {
  await persistCurrentCase();

  const newCase = createEmptyCase({
    caseName: `Caso ${state.cases.length + 1}`,
  });

  upsertCaseInState(newCase);
  state.currentCaseId = newCase.id;
  await putCase(newCase);
  await setAppState("selectedCaseId", newCase.id);

  syncInputsFromCase();
  render();
  showToast("Nuovo caso creato.");
}

async function removeCase(id) {
  const record = state.cases.find((entry) => entry.id === id);
  if (!record) {
    return;
  }

  const confirmed = window.confirm(`Eliminare il caso "${getSubjectLabel(record)}"?`);
  if (!confirmed) {
    return;
  }

  await persistCurrentCase();
  await deleteCase(id);
  state.cases = state.cases.filter((entry) => entry.id !== id);

  if (!state.cases.length) {
    const seedCase = createEmptyCase({ caseName: "Nuovo caso" });
    state.cases = [seedCase];
    state.currentCaseId = seedCase.id;
    await putCase(seedCase);
    await setAppState("selectedCaseId", seedCase.id);
  } else if (state.currentCaseId === id) {
    state.currentCaseId = state.cases[0].id;
    await setAppState("selectedCaseId", state.currentCaseId);
  }

  syncInputsFromCase();
  render();
  showToast("Caso eliminato.");
}

function startEditingGraphEntity(id) {
  const record = getCurrentCase();
  const entity = record?.graphEntities?.find((entry) => entry.id === id);

  if (!entity) {
    return;
  }

  dom.graphEntityForm.querySelector('[name="entityId"]').value = entity.id;
  dom.graphEntityForm.querySelector('[name="type"]').value = entity.type || "alias";
  dom.graphEntityForm.querySelector('[name="label"]').value = entity.label || "";
  dom.graphEntityForm.querySelector('[name="value"]').value = entity.value || "";
  dom.graphEntityForm.querySelector('[name="notes"]').value = entity.notes || "";
  dom.graphEntityForm.querySelector('[name="confidence"]').value = entity.confidence || "medium";
  dom.graphEntitySubmitButton.textContent = "Aggiorna nodo";
}

function removeGraphEntity(id) {
  const record = getCurrentCase();
  if (!record) {
    return;
  }

  const nextGraphLayout = { ...(record.graphLayout || {}) };
  delete nextGraphLayout[id];

  updateCurrentCase(
    {
      graphEntities: (record.graphEntities || []).filter((entry) => entry.id !== id),
      graphRelations: (record.graphRelations || []).filter(
        (entry) => entry.sourceId !== id && entry.targetId !== id
      ),
      graphLayout: nextGraphLayout,
      evidenceBoard: (record.evidenceBoard || []).map((entry) => ({
        ...entry,
        linkedNodeIds: (entry.linkedNodeIds || []).filter((nodeId) => nodeId !== id),
        linkedRelationIds: (entry.linkedRelationIds || []).filter((relationId) =>
          !(record.graphRelations || []).some(
            (relation) =>
              relation.id === relationId && (relation.sourceId === id || relation.targetId === id)
          )
        ),
      })),
      graphFocusId: record.graphFocusId === id ? "" : record.graphFocusId,
    },
    { persist: true, toastMessage: "Nodo manuale rimosso dal grafo." }
  );

  if (dom.graphEntityForm.querySelector('[name="entityId"]').value === id) {
    resetGraphEntityForm();
  }
}

function startEditingGraphRelation(id) {
  const record = getCurrentCase();
  const relation = record?.graphRelations?.find((entry) => entry.id === id);

  if (!relation) {
    return;
  }

  dom.graphRelationForm.querySelector('[name="relationId"]').value = relation.id;
  dom.graphRelationForm.querySelector('[name="label"]').value = relation.label || "";
  dom.graphRelationForm.querySelector('[name="notes"]').value = relation.notes || "";
  dom.graphRelationForm.querySelector('[name="confidence"]').value = relation.confidence || "medium";
  populateGraphNodeSelect(dom.graphSourceNode, getGraphNodeOptions(record), relation.sourceId);
  populateGraphNodeSelect(dom.graphTargetNode, getGraphNodeOptions(record), relation.targetId);
  dom.graphRelationSubmitButton.textContent = "Aggiorna relazione";
}

function removeGraphRelation(id) {
  const record = getCurrentCase();
  if (!record) {
    return;
  }

  updateCurrentCase(
    {
      graphRelations: (record.graphRelations || []).filter((entry) => entry.id !== id),
      evidenceBoard: (record.evidenceBoard || []).map((entry) => ({
        ...entry,
        linkedRelationIds: (entry.linkedRelationIds || []).filter((relationId) => relationId !== id),
      })),
    },
    { persist: true, toastMessage: "Relazione rimossa dal grafo." }
  );

  if (dom.graphRelationForm.querySelector('[name="relationId"]').value === id) {
    resetGraphRelationForm();
  }
}

function removeEvidence(id) {
  const record = getCurrentCase();
  if (!record) {
    return;
  }

  updateCurrentCase(
    {
      evidenceBoard: (record.evidenceBoard || []).filter((entry) => entry.id !== id),
    },
    { persist: true, toastMessage: "Evidenza rimossa." }
  );
}

function removeTimelineEvent(id) {
  const record = getCurrentCase();
  if (!record) {
    return;
  }

  updateCurrentCase(
    {
      timeline: (record.timeline || []).filter((entry) => entry.id !== id),
    },
    { persist: true, toastMessage: "Evento timeline rimosso." }
  );
}

function cycleTaskStatus(id) {
  const record = getCurrentCase();
  if (!record) {
    return;
  }

  const statusOrder = ["todo", "in-progress", "done", "blocked"];
  const nextTasks = (record.tasks || []).map((task) => {
    if (task.id !== id) {
      return task;
    }

    const currentIndex = statusOrder.indexOf(task.status || "todo");
    const nextStatus = statusOrder[(currentIndex + 1 + statusOrder.length) % statusOrder.length];

    return {
      ...task,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
  });

  updateCurrentCase(
    {
      tasks: nextTasks,
    },
    { persist: true, toastMessage: "Stato task aggiornato." }
  );
}

function removeTask(id) {
  const record = getCurrentCase();
  if (!record) {
    return;
  }

  updateCurrentCase(
    {
      tasks: (record.tasks || []).filter((task) => task.id !== id),
    },
    { persist: true, toastMessage: "Task rimosso dal caso." }
  );
}

function saveSearchAsEvidence(searchId) {
  const record = getCurrentCase();
  const search = state.renderCache.searches.find((item) => item.id === searchId);

  if (!record || !search) {
    return;
  }

  const linkedNodeIds = (search.fields || [])
    .map((field) => `field:${field}`)
    .filter((nodeId, index, collection) => collection.indexOf(nodeId) === index);

  const evidenceEntry = createEvidenceEntry({
    title: search.title,
    source: search.category,
    url: search.url,
    notes: `${search.description} Query salvata dal pack "${search.tag}".`,
    type: search.category === "Social" ? "social" : search.category === "Geo" ? "note" : "web",
    status: "to-verify",
    confidence: linkedNodeIds.length >= 2 ? "medium" : "low",
    linkedNodeIds,
    linkedRelationIds: [],
    sourceType: "search",
    sourceLabel: search.title,
  });

  updateCurrentCase(
    {
      evidenceBoard: [evidenceEntry, ...(record.evidenceBoard || [])],
    },
    { persist: true, toastMessage: "Query salvata come evidenza." }
  );
}

function saveSocialProfileAsEvidence(profileId) {
  const record = getCurrentCase();
  const profile = state.renderCache.socialProfiles.find((item) => item.id === profileId);

  if (!record || !profile) {
    return;
  }

  const linkedNodeIds = ["field:username", "field:name", "field:surname", "field:location", "field:imageDataUrl"].filter(
    (nodeId) => getGraphNodeOptions(record).some((option) => option.id === nodeId)
  );
  const evidenceEntry = createEvidenceEntry({
    title: `${profile.name} - ${profile.handle !== "-" ? profile.handle : profile.matchLabel}`,
    source: profile.name,
    url: profile.directUrl || profile.searchUrl,
    notes: `${profile.notes} Segnali: ${profile.signals.join(", ") || "nessuno"}. Next step: ${profile.nextStep}`,
    type: "social",
    status: "to-verify",
    confidence: profile.confidence >= 80 ? "high" : profile.confidence >= 55 ? "medium" : "low",
    linkedNodeIds,
    linkedRelationIds: [],
    sourceType: "social-profile",
    sourceLabel: profile.name,
  });

  updateCurrentCase(
    {
      evidenceBoard: [evidenceEntry, ...(record.evidenceBoard || [])],
    },
    { persist: true, toastMessage: "Profilo social salvato come evidenza." }
  );
}

function resetGraphLayout() {
  updateCurrentCase(
    {
      graphLayout: {},
    },
    { persist: true, toastMessage: "Layout cluster del grafo ripristinato." }
  );
}

async function setView(viewId) {
  state.currentView = viewId;
  await setAppState("currentView", viewId);
  renderViewState();
}

function render() {
  const record = getCurrentCase();
  if (!record) {
    return;
  }

  const searches = buildSearches(record).map((search, index) => ({
    ...search,
    id: `search-${index}`,
  }));
  const graphNodeOptions = getGraphNodeOptions(record);
  const activeGraphNode = graphNodeOptions.find((option) => option.id === record.graphFocusId) || null;
  const filteredSearches = filterSearches(searches, activeGraphNode?.filterField || "");
  const score = computeConfidenceScore(record);
  const socialProfiles = buildSocialProfiles(record).map((profile, index) => ({
    ...profile,
    id: profile.id || `social-profile-${index}`,
  }));
  const groupedSearches = groupSearchesByCategory(searches);
  const socialSearches = searches.filter((search) => search.category === "Social");
  const geoIntel = {
    ...buildGeoIntelligence(record),
    searches: searches.filter((search) => search.category === "Geo"),
  };

  state.renderCache = {
    searches,
    socialProfiles,
  };

  dom.reanalyzeImageButton.disabled = !record.imageDataUrl;
  renderH