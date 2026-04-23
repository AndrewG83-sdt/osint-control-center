(() => {
  const now = () => new Date().toISOString();

  function makeLocalId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `case-${Date.now()}`;
  }

  function createEmptyCase(overrides = {}) {
    const timestamp = now();

    return {
      id: makeLocalId(),
      caseName: "",
      status: "active",
      priority: "medium",
      tags: "",
      name: "",
      surname: "",
      username: "",
      email: "",
      phone: "",
      location: "",
      notes: "",
      imageDataUrl: "",
      imageName: "",
      imageType: "",
      imageSize: 0,
      imageUpdatedAt: "",
      imageExif: null,
      imageOcr: {
        status: "idle",
        supported: false,
        fullText: "",
        lines: [],
        analyzedAt: "",
        errorMessage: "",
      },
      imageAnalysisUpdatedAt: "",
      graphEntities: [],
      graphRelations: [],
      graphLayout: {},
      graphFocusId: "",
      evidenceBoard: [],
      timeline: [],
      tasks: [],
      focusField: "",
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function createGraphEntity(overrides = {}) {
    const timestamp = now();

    return {
      id: makeLocalId(),
      type: "alias",
      label: "",
      value: "",
      notes: "",
      confidence: "medium",
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function createGraphRelation(overrides = {}) {
    const timestamp = now();

    return {
      id: makeLocalId(),
      sourceId: "subject",
      targetId: "",
      label: "collegato a",
      notes: "",
      confidence: "medium",
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function createEvidenceEntry(overrides = {}) {
    const timestamp = now();

    return {
      id: makeLocalId(),
      title: "",
      source: "",
      url: "",
      notes: "",
      type: "web",
      status: "to-verify",
      confidence: "medium",
      linkedNodeIds: [],
      linkedRelationIds: [],
      sourceType: "",
      sourceLabel: "",
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function createTimelineEntry(overrides = {}) {
    const timestamp = now();

    return {
      id: makeLocalId(),
      title: "",
      date: timestamp.slice(0, 10),
      time: "",
      category: "finding",
      description: "",
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function createTaskEntry(overrides = {}) {
    const timestamp = now();

    return {
      id: makeLocalId(),
      title: "",
      status: "todo",
      priority: "medium",
      notes: "",
      dueDate: "",
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  window.OSINT_CONFIG = {
    DB_NAME: "osint-control-center-db",
    DB_VERSION: 1,
    LEGACY_CURRENT_KEY: "osint-control-center.current",
    LEGACY_SNAPSHOTS_KEY: "osint-control-center.snapshots",
    FIELD_META: {
      caseName: { label: "Caso", weight: 0, tone: "#61d0ff" },
      status: { label: "Stato", weight: 0, tone: "#61d0ff" },
      priority: { label: "Priorita", weight: 0, tone: "#ffd06b" },
      tags: { label: "Tag", weight: 0, tone: "#7de5d8" },
      name: { label: "Nome", weight: 14, tone: "#61d0ff" },
      surname: { label: "Cognome", weight: 14, tone: "#7de5d8" },
      username: { label: "Username", weight: 22, tone: "#1dc2b1" },
      email: { label: "Email", weight: 22, tone: "#ffd06b" },
      phone: { label: "Telefono", weight: 18, tone: "#ff9e7c" },
      location: { label: "Luogo", weight: 10, tone: "#c793ff" },
      imageDataUrl: { label: "Immagine", weight: 10, tone: "#93afff" },
      notes: { label: "Note", weight: 0, tone: "#61d0ff" },
    },
    FIELD_LABELS: {
      name: "Nome",
      surname: "Cognome",
      username: "Username",
      email: "Email",
      phone: "Telefono",
      location: "Luogo",
      imageDataUrl: "Immagine",
    },
    CASE_STATUS_OPTIONS: [
      { value: "active", label: "Attivo" },
      { value: "monitoring", label: "Monitoraggio" },
      { value: "validated", label: "Validato" },
      { value: "archived", label: "Archiviato" },
    ],
    CASE_PRIORITY_OPTIONS: [
      { value: "low", label: "Bassa" },
      { value: "medium", label: "Media" },
      { value: "high", label: "Alta" },
      { value: "critical", label: "Critica" },
    ],
    EVIDENCE_TYPE_OPTIONS: [
      { value: "web", label: "Web" },
      { value: "social", label: "Social" },
      { value: "image", label: "Image" },
      { value: "document", label: "Document" },
      { value: "note", label: "Note" },
    ],
    EVIDENCE_STATUS_OPTIONS: [
      { value: "to-verify", label: "Da verificare" },
      { value: "partial", label: "Parziale" },
      { value: "validated", label: "Validata" },
      { value: "discarded", label: "Scartata" },
    ],
    EVIDENCE_CONFIDENCE_OPTIONS: [
      { value: "low", label: "Bassa" },
      { value: "medium", label: "Media" },
      { value: "high", label: "Alta" },
    ],
    GRAPH_ENTITY_TYPE_OPTIONS: [
      { value: "alias", label: "Alias", tone: "#1dc2b1" },
      { value: "social", label: "Account social", tone: "#61d0ff" },
      { value: "organization", label: "Organizzazione", tone: "#ffd06b" },
      { value: "location", label: "Luogo", tone: "#c793ff" },
      { value: "document", label: "Documento", tone: "#ff9e7c" },
      { value: "contact", label: "Contatto", tone: "#93afff" },
      { value: "note", label: "Nota", tone: "#8fa3b7" },
    ],
    GRAPH_RELATION_CONFIDENCE_OPTIONS: [
      { value: "low", label: "Bassa" },
      { value: "medium", label: "Media" },
      { value: "high", label: "Alta" },
    ],
    TIMELINE_CATEGORY_OPTIONS: [
      { value: "finding", label: "Finding" },
      { value: "activity", label: "Attivita" },
      { value: "validation", label: "Verifica" },
      { value: "alert", label: "Alert" },
    ],
    TASK_STATUS_OPTIONS: [
      { value: "todo", label: "Da fare" },
      { value: "in-progress", label: "In corso" },
      { value: "done", label: "Completata" },
      { value: "blocked", label: "Bloccata" },
    ],
    TASK_PRIORITY_OPTIONS: [
      { value: "low", label: "Bassa" },
      { value: "medium", label: "Media" },
      { value: "high", label: "Alta" },
      { value: "critical", label: "Critica" },
    ],
    VIEW_OPTIONS: [
      { id: "dashboard", label: "Dashboard" },
      { id: "social", label: "Social" },
      { id: "images", label: "Images" },
      { id: "reports", label: "Reports" },
      { id: "cases", label: "Cases" },
    ],
    SOCIAL_PLATFORMS: [
      {
        name: "Facebook",
        site: "facebook.com",
        buildProfileUrl(handle) {
          return `https://www.facebook.com/${encodeURIComponent(handle)}`;
        },
      },
      {
        name: "Instagram",
        site: "instagram.com",
        buildProfileUrl(handle) {
          return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
        },
      },
      {
        name: "TikTok",
        site: "tiktok.com",
        buildProfileUrl(handle) {
          return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
        },
      },
    ],
    createGraphEntity,
    createGraphRelation,
    createEvidenceEntry,
    createTimelineEntry,
    createTaskEntry,
    createEmptyCase,
  };
})();
