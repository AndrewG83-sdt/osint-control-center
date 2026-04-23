(() => {
  const {
    DB_NAME,
    DB_VERSION,
    LEGACY_CURRENT_KEY,
    LEGACY_SNAPSHOTS_KEY,
    createEmptyCase,
    createGraphEntity,
    createGraphRelation,
    createEvidenceEntry,
    createTimelineEntry,
    createTaskEntry,
  } = window.OSINT_CONFIG;
  const { safeParse, hasCaseContent, sortCasesByUpdatedAt } = window.OSINT_UTILS;

  let dbPromise = null;

  function normalizeCaseRecord(record = {}) {
    const seed = createEmptyCase();

    return {
      ...seed,
      ...record,
      imageExif: record.imageExif ?? seed.imageExif,
      imageOcr: {
        ...seed.imageOcr,
        ...(record.imageOcr || {}),
      },
      imageAnalysisUpdatedAt: record.imageAnalysisUpdatedAt || seed.imageAnalysisUpdatedAt,
      graphEntities: Array.isArray(record.graphEntities)
        ? record.graphEntities.map((entry) => ({ ...createGraphEntity(), ...entry }))
        : seed.graphEntities,
      graphRelations: Array.isArray(record.graphRelations)
        ? record.graphRelations.map((entry) => ({ ...createGraphRelation(), ...entry }))
        : seed.graphRelations,
      graphLayout:
        record.graphLayout && typeof record.graphLayout === "object" ? { ...record.graphLayout } : seed.graphLayout,
      graphFocusId: record.graphFocusId || record.focusField || seed.graphFocusId,
      evidenceBoard: Array.isArray(record.evidenceBoard)
        ? record.evidenceBoard.map((entry) => ({
            ...createEvidenceEntry(),
            ...entry,
            linkedNodeIds: Array.isArray(entry.linkedNodeIds) ? [...entry.linkedNodeIds] : [],
            linkedRelationIds: Array.isArray(entry.linkedRelationIds) ? [...entry.linkedRelationIds] : [],
          }))
        : seed.evidenceBoard,
      timeline: Array.isArray(record.timeline)
        ? record.timeline.map((entry) => ({ ...createTimelineEntry(), ...entry }))
        : seed.timeline,
      tasks: Array.isArray(record.tasks)
        ? record.tasks.map((entry) => ({ ...createTaskEntry(), ...entry }))
        : seed.tasks,
    };
  }

  function openDatabase() {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains("cases")) {
          const casesStore = database.createObjectStore("cases", { keyPath: "id" });
          casesStore.createIndex("updatedAt", "updatedAt", { unique: false });
        }

        if (!database.objectStoreNames.contains("appState")) {
          database.createObjectStore("appState", { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromise;
  }

  function requestAsPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function withStore(storeName, mode, callback) {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return callback(store);
  }

  async function getAllCases() {
    const results = await withStore("cases", "readonly", (store) => requestAsPromise(store.getAll()));
    return sortCasesByUpdatedAt((results || []).map((record) => normalizeCaseRecord(record)));
  }

  async function putCase(record) {
    const normalized = normalizeCaseRecord(record);
    await withStore("cases", "readwrite", (store) => requestAsPromise(store.put(normalized)));
    return normalized;
  }

  async function deleteCase(id) {
    await withStore("cases", "readwrite", (store) => requestAsPromise(store.delete(id)));
  }

  async function getAppState(key) {
    const entry = await withStore("appState", "readonly", (store) => requestAsPromise(store.get(key)));
    return entry ? entry.value : null;
  }

  async function setAppState(key, value) {
    await withStore("appState", "readwrite", (store) => requestAsPromise(store.put({ key, value })));
  }

  function buildLegacyCase(source, fallbackLabel, createdAt) {
    const base = normalizeCaseRecord();
    const timestamp = createdAt || source.imageUpdatedAt || new Date().toISOString();

    return {
      ...base,
      ...source,
      id: base.id,
      caseName: source.caseName || source.label || fallbackLabel || "",
      status: source.status || "active",
      priority: source.priority || "medium",
      tags: source.tags || "legacy",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  async function migrateLegacyLocalStorage() {
    const migratedFlag = await getAppState("legacyMigrated");

    if (migratedFlag) {
      return;
    }

    const current = safeParse(localStorage.getItem(LEGACY_CURRENT_KEY), {});
    const snapshots = safeParse(localStorage.getItem(LEGACY_SNAPSHOTS_KEY), []);
    const casesToImport = [];

    if (hasCaseContent(current)) {
      casesToImport.push(buildLegacyCase(current, current.caseName || "Caso importato"));
    }

    if (Array.isArray(snapshots)) {
      snapshots.forEach((snapshot) => {
        if (snapshot && snapshot.data && hasCaseContent(snapshot.data)) {
          casesToImport.push(
            buildLegacyCase(
              snapshot.data,
              snapshot.label || snapshot.data.caseName || "Snapshot importato",
              snapshot.createdAt
            )
          );
        }
      });
    }

    const uniqueCases = [];
    const signatures = new Set();

    casesToImport.forEach((record) => {
      const signature = JSON.stringify({
        caseName: record.caseName,
        name: record.name,
        surname: record.surname,
        username: record.username,
        email: record.email,
        phone: record.phone,
      });

      if (!signatures.has(signature)) {
        signatures.add(signature);
        uniqueCases.push(record);
      }
    });

    for (const record of uniqueCases) {
      await putCase(record);
    }

    if (uniqueCases.length) {
      await setAppState("selectedCaseId", uniqueCases[0].id);
    }

    await setAppState("currentView", "dashboard");
    await setAppState("legacyMigrated", true);

    localStorage.removeItem(LEGACY_CURRENT_KEY);
    localStorage.removeItem(LEGACY_SNAPSHOTS_KEY);
  }

  async function ensureSeedCase() {
    const cases = await getAllCases();

    if (cases.length) {
      return cases;
    }

    const freshCase = createEmptyCase({ caseName: "Nuovo caso" });
    await putCase(freshCase);
    await setAppState("selectedCaseId", freshCase.id);
    return [freshCase];
  }

  async function loadWorkspace() {
    await openDatabase();
    await migrateLegacyLocalStorage();

    let cases = await ensureSeedCase();
    let selectedCaseId = await getAppState("selectedCaseId");
    const currentView = (await getAppState("currentView")) || "dashboard";

    if (!selectedCaseId || !cases.some((record) => record.id === selectedCaseId)) {
      selectedCaseId = cases[0].id;
      await setAppState("selectedCaseId", selectedCaseId);
    }

    cases = await getAllCases();

    return {
      cases,
      selectedCaseId,
      currentView,
    };
  }

  window.OSINT_STORAGE = {
    loadWorkspace,
    getAllCases,
    putCase,
    deleteCase,
    getAppState,
    setAppState,
  };
})();
