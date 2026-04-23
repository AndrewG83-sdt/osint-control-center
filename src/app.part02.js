EntityForm);
  const entityId = String(formData.get("entityId") || "").trim();
  const label = String(formData.get("label") || "").trim();

  if (!label) {
    showToast("Inserisci un'etichetta per il nodo.");
    return;
  }

  const existingEntity = (record.graphEntities || []).find((entry) => entry.id === entityId);
  const entityPayload = {
    type: String(formData.get("type") || "alias"),
    label,
    value: String(formData.get("value") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    confidence: String(formData.get("confidence") || "medium"),
    updatedAt: new Date().toISOString(),
  };

  const graphEntities = existingEntity
    ? (record.graphEntities || []).map((entry) =>
        entry.id === entityId ? { ...entry, ...entityPayload } : entry
      )
    : [createGraphEntity(entityPayload), ...(record.graphEntities || [])];

  updateCurrentCase(
    {
      graphEntities,
    },
    { persist: true, toastMessage: existingEntity ? "Nodo manuale aggiornato." : "Nodo manuale aggiunto." }
  );

  resetGraphEntityForm();
}

function handleGraphRelationSubmit(event) {
  event.preventDefault();
  const record = getCurrentCase();

  if (!record) {
    return;
  }

  const formData = new FormData(dom.graphRelationForm);
  const relationId = String(formData.get("relationId") || "").trim();
  const sourceId = String(formData.get("sourceId") || "").trim();
  const targetId = String(formData.get("targetId") || "").trim();
  const label = String(formData.get("label") || "").trim();
  const graphNodeOptions = getGraphNodeOptions(record);

  if (!sourceId || !targetId) {
    showToast("Seleziona entrambi i nodi della relazione.");
    return;
  }

  if (sourceId === targetId) {
    showToast("I due estremi della relazione devono essere diversi.");
    return;
  }

  if (!label) {
    showToast("Inserisci il tipo di relazione.");
    return;
  }

  if (!graphNodeOptions.some((option) => option.id === sourceId) || !graphNodeOptions.some((option) => option.id === targetId)) {
    showToast("Uno dei nodi selezionati non e piu disponibile.");
    return;
  }

  const existingRelation = (record.graphRelations || []).find((entry) => entry.id === relationId);
  const relationPayload = {
    sourceId,
    targetId,
    label,
    notes: String(formData.get("notes") || "").trim(),
    confidence: String(formData.get("confidence") || "medium"),
    updatedAt: new Date().toISOString(),
  };

  const graphRelations = existingRelation
    ? (record.graphRelations || []).map((entry) =>
        entry.id === relationId ? { ...entry, ...relationPayload } : entry
      )
    : [createGraphRelation(relationPayload), ...(record.graphRelations || [])];

  updateCurrentCase(
    {
      graphRelations,
    },
    { persist: true, toastMessage: existingRelation ? "Relazione aggiornata." : "Relazione aggiunta al grafo." }
  );

  resetGraphRelationForm();
}

function handleEvidenceSubmit(event) {
  event.preventDefault();
  const record = getCurrentCase();

  if (!record) {
    return;
  }

  const formData = new FormData(dom.evidenceForm);
  const title = String(formData.get("title") || "").trim();

  if (!title) {
    showToast("Inserisci un titolo per l'evidenza.");
    return;
  }

  const evidenceEntry = createEvidenceEntry({
    title,
    source: String(formData.get("source") || "").trim(),
    url: String(formData.get("url") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    type: String(formData.get("type") || "web"),
    status: String(formData.get("status") || "to-verify"),
    confidence: String(formData.get("confidence") || "medium"),
    linkedNodeIds: getCheckedValues(dom.evidenceLinkedNodes),
    linkedRelationIds: getCheckedValues(dom.evidenceLinkedRelations),
  });

  updateCurrentCase(
    {
      evidenceBoard: [evidenceEntry, ...(record.evidenceBoard || [])],
    },
    { persist: true, toastMessage: "Evidenza aggiunta al dossier." }
  );

  dom.evidenceForm.reset();
  const confidenceInput = dom.evidenceForm.querySelector('[name="confidence"]');
  const typeInput = dom.evidenceForm.querySelector('[name="type"]');
  const statusInput = dom.evidenceForm.querySelector('[name="status"]');
  if (confidenceInput) {
    confidenceInput.value = "medium";
  }
  if (typeInput) {
    typeInput.value = "web";
  }
  if (statusInput) {
    statusInput.value = "to-verify";
  }
  resetEvidenceLinkSelections();
}

function handleTimelineSubmit(event) {
  event.preventDefault();
  const record = getCurrentCase();

  if (!record) {
    return;
  }

  const formData = new FormData(dom.timelineForm);
  const title = String(formData.get("title") || "").trim();

  if (!title) {
    showToast("Inserisci un titolo per l'evento timeline.");
    return;
  }

  const timelineEntry = createTimelineEntry({
    title,
    date: String(formData.get("date") || "").trim() || new Date().toISOString().slice(0, 10),
    time: String(formData.get("time") || "").trim(),
    category: String(formData.get("category") || "finding"),
    description: String(formData.get("description") || "").trim(),
  });

  updateCurrentCase(
    {
      timeline: [...(record.timeline || []), timelineEntry],
    },
    { persist: true, toastMessage: "Evento timeline aggiunto." }
  );

  dom.timelineForm.reset();
  const timelineDateInput = dom.timelineForm.querySelector('[name="date"]');
  if (timelineDateInput) {
    timelineDateInput.value = new Date().toISOString().slice(0, 10);
  }
  const categoryInput = dom.timelineForm.querySelector('[name="category"]');
  if (categoryInput) {
    categoryInput.value = "finding";
  }
}

function handleTaskSubmit(event) {
  event.preventDefault();
  const record = getCurrentCase();

  if (!record) {
    return;
  }

  const formData = new FormData(dom.taskForm);
  const title = String(formData.get("title") || "").trim();

  if (!title) {
    showToast("Inserisci un titolo per il task.");
    return;
  }

  const taskEntry = createTaskEntry({
    title,
    status: String(formData.get("status") || "todo"),
    priority: String(formData.get("priority") || "medium"),
    dueDate: String(formData.get("dueDate") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  });

  updateCurrentCase(
    {
      tasks: [taskEntry, ...(record.tasks || [])],
    },
    { persist: true, toastMessage: "Task operativo aggiunto al caso." }
  );

  dom.taskForm.reset();
  dom.taskForm.querySelector('[name="status"]').value = "todo";
  dom.taskForm.querySelector('[name="priority"]').value = "medium";
}

function handleCaseFilterMutation() {
  state.caseFilters = {
    query: String(dom.caseSearchInput.value || "").trim().toLowerCase(),
    status: dom.caseStatusFilter.value || "all",
    priority: dom.casePriorityFilter.value || "all",
  };

  renderCasesView(getCurrentCase());
}

function getCheckedValues(container) {
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
}

function handleDelegatedClick(event) {
  const openButton = event.target.closest("[data-open-url]");
  if (openButton) {
    window.open(openButton.dataset.openUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const copyButton = event.target.closest("[data-copy-text]");
  if (copyButton) {
    copyText(copyButton.dataset.copyText);
    return;
  }

  const saveSearchButton = event.target.closest("[data-save-search]");
  if (saveSearchButton) {
    saveSearchAsEvidence(saveSearchButton.dataset.saveSearch);
    return;
  }

  const saveProfileButton = event.target.closest("[data-save-social-profile]");
  if (saveProfileButton) {
    saveSocialProfileAsEvidence(saveProfileButton.dataset.saveSocialProfile);
    return;
  }

  const focusNodeButton = event.target.closest("[data-focus-node]");
  if (focusNodeButton) {
    updateCurrentCase({ graphFocusId: focusNodeButton.dataset.focusNode }, { persist: true, touch: false });
    return;
  }

  const loadCaseButton = event.target.closest("[data-load-case]");
  if (loadCaseButton) {
    switchCase(loadCaseButton.dataset.loadCase);
    return;
  }

  const deleteCaseButton = event.target.closest("[data-delete-case]");
  if (deleteCaseButton) {
    void removeCase(deleteCaseButton.dataset.deleteCase);
    return;
  }

  const editEntityButton = event.target.closest("[data-edit-entity]");
  if (editEntityButton) {
    startEditingGraphEntity(editEntityButton.dataset.editEntity);
    return;
  }

  const deleteEntityButton = event.target.closest("[data-delete-entity]");
  if (deleteEntityButton) {
    removeGraphEntity(deleteEntityButton.dataset.deleteEntity);
    return;
  }

  const editRelationButton = event.target.closest("[data-edit-relation]");
  if (editRelationButton) {
    startEditingGraphRelation(editRelationButton.dataset.editRelation);
    return;
  }

  const deleteRelationButton = event.target.closest("[data-delete-relation]");
  if (deleteRelationButton) {
    removeGraphRelation(deleteRelationButton.dataset.deleteRelation);
    return;
  }

  const deleteEvidenceButton = event.target.closest("[data-delete-evidence]");
  if (deleteEvidenceButton) {
    removeEvidence(deleteEvidenceButton.dataset.deleteEvidence);
    return;
  }

  const deleteTimelineButton = event.target.closest("[data-delete-timeline]");
  if (deleteTimelineButton) {
    removeTimelineEvent(deleteTimelineButton.dataset.deleteTimeline);
    return;
  }

  const cycleTaskButton = event.target.closest("[data-cycle-task]");
  if (cycleTaskButton) {
    cycleTaskStatus(cycleTaskButton.dataset.cycleTask);
    return;
  }

  const deleteTaskButton = event.target.closest("[data-delete-task]");
  if (deleteTaskButton) {
    removeTask(deleteTaskButton.dataset.deleteTask);
  }
}

function getCurrentCase() {
  return state.cases.find((record) => record.id === state.currentCaseId) || null;
}

function upsertCaseInState(record) {
  state.cases = sortCasesByUpdatedAt([...state.cases.filter((entry) => entry.id !== record.id), record]);
}

function syncInputsFromCase() {
  const record = getCurrentCase();
  if (!record) {
    return;
  }

  dom.form.querySelectorAll("[data-field]").forEach((input) => {
    input.value = record[input.dataset.field] || "";
  });

  dom.imageInput.value = "";
  resetGraphEntityForm();
  resetGraphRelationForm();
  dom.evidenceForm.reset();
  dom.timelineForm.reset();
  dom.taskForm.reset();
  resetEvidenceLinkSelections();
  const timelineDateInput = dom.timelineForm.querySelector('[name="date"]');
  if (timelineDateInput && !timelineDateInput.value) {
    timelineDateInput.value = new Date().toISOString().slice(0, 10);
  }
  const evidenceTypeInput = dom.evidenceForm.querySelector('[name="type"]');
  const evidenceStatusInput = dom.evidenceForm.querySelector('[name="status"]');
  const evidenceConfidenceInput = dom.evidenceForm.querySelector('[name="confidence"]');
  const timelineCategoryInput = dom.timelineForm.querySelector('[name="category"]');
  if (evidenceTypeInput) {
    evidenceTypeInput.value = "web";
  }
  if (evidenceStatusInput) {
    evidenceStatusInput.value = "to-verify";
  }
  if (evidenceConfidenceInput) {
    evidenceConfidenceInput.value = "medium";
  }
  if (timelineCategoryInput) {
    timelineCategoryInput.value = "finding";
  }
  const taskStatusInput = dom.taskForm.querySelector('[name="status"]');
  const taskPriorityInput = dom.taskForm.querySelector('[name="priority"]');
  if (taskStatusInput) {
    taskStatusInput.value = "todo";
  }
  if (taskPriorityInput) {
    taskPriorityInput.value = "medium";
  }
}

function resetGraphEntityForm() {
  dom.graphEntityForm.reset();
  const entityIdInput = dom.graphEntityForm.querySelector('[name="entityId"]');
  const entityTypeInput = dom.graphEntityForm.querySelector('[name="type"]');
  const entityConfidenceInput = dom.graphEntityForm.querySelector('[name="confidence"]');

  if (entityIdInput) {
    entityIdInput.value = "";
  }
  if (entityTypeInput) {
    entityTypeInput.value = "alias";
  }
  if (entityConfi