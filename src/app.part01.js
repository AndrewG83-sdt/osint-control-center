const {
  createEmptyCase,
  createGraphEntity,
  createGraphRelation,
  createEvidenceEntry,
  createTimelineEntry,
  createTaskEntry,
  FIELD_LABELS,
  GRAPH_ENTITY_TYPE_OPTIONS,
} = window.OSINT_CONFIG;
const {
  formatDate,
  formatBytes,
  escapeHtml,
  parseTags,
  sortCasesByUpdatedAt,
  truncate,
  getSafeImageDataUrl,
} = window.OSINT_UTILS;
const { loadWorkspace, putCase, deleteCase, setAppState } = window.OSINT_STORAGE;
const {
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
} = window.OSINT_SEARCHES;
const {
  inspectImageFile,
  reanalyzeImageFromDataUrl,
  buildImageInsights,
  buildImageChecklist,
  buildExifCards,
  buildOcrSummary,
} = window.OSINT_IMAGE;
const { renderGraph } = window.OSINT_GRAPH;
const { buildExportPayload, exportJson, exportReport, exportPdf } = window.OSINT_EXPORTS;

const state = {
  cases: [],
  currentCaseId: "",
  currentView: "dashboard",
  deferredInstallPrompt: null,
  persistQueue: Promise.resolve(),
  caseFilters: {
    query: "",
    status: "all",
    priority: "all",
  },
  renderCache: {
    searches: [],
    socialProfiles: [],
  },
};

let toastTimer = null;
let dom = {};

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error(error);
    showToast("Errore durante l'avvio della web app.");
  });
});

async function init() {
  cacheDom();
  bindEvents();

  const workspace = await loadWorkspace();
  state.cases = workspace.cases;
  state.currentCaseId = workspace.selectedCaseId;
  state.currentView = workspace.currentView || "dashboard";

  syncInputsFromCase();
  render();
  registerServiceWorker();
}

function cacheDom() {
  dom = {
    form: document.getElementById("intelForm"),
    subjectLabel: document.getElementById("subjectLabel"),
    caseSummary: document.getElementById("caseSummary"),
    scoreValue: document.getElementById("scoreValue"),
    scoreFill: document.getElementById("scoreFill"),
    caseMetaChips: document.getElementById("caseMetaChips"),
    metricCards: document.getElementById("metricCards"),
    coverageChips: document.getElementById("coverageChips"),
    graphCanvas: document.getElementById("graphCanvas"),
    clearFocusButton: document.getElementById("clearFocusButton"),
    resetGraphLayoutButton: document.getElementById("resetGraphLayoutButton"),
    graphEntityCount: document.getElementById("graphEntityCount"),
    graphRelationCount: document.getElementById("graphRelationCount"),
    graphEntityForm: document.getElementById("graphEntityForm"),
    graphEntitySubmitButton: document.getElementById("graphEntitySubmitButton"),
    resetGraphEntityButton: document.getElementById("resetGraphEntityButton"),
    graphRelationForm: document.getElementById("graphRelationForm"),
    graphRelationSubmitButton: document.getElementById("graphRelationSubmitButton"),
    resetGraphRelationButton: document.getElementById("resetGraphRelationButton"),
    graphSourceNode: document.getElementById("graphSourceNode"),
    graphTargetNode: document.getElementById("graphTargetNode"),
    graphEntitiesList: document.getElementById("graphEntitiesList"),
    graphRelationsList: document.getElementById("graphRelationsList"),
    graphDragHint: document.getElementById("graphDragHint"),
    queryCount: document.getElementById("queryCount"),
    queryPacks: document.getElementById("queryPacks"),
    activeFocusBanner: document.getElementById("activeFocusBanner"),
    recommendations: document.getElementById("recommendations"),
    caseCountLabel: document.getElementById("caseCountLabel"),
    dashboardCaseArchive: document.getElementById("dashboardCaseArchive"),
    socialProfiles: document.getElementById("socialProfiles"),
    socialSearches: document.getElementById("socialSearches"),
    socialQueryCount: document.getElementById("socialQueryCount"),
    imageInput: document.getElementById("imageInput"),
    imagePreview: document.getElementById("imagePreview"),
    imageMeta: document.getElementById("imageMeta"),
    imageStatus: document.getElementById("imageStatus"),
    imageInsights: document.getElementById("imageInsights"),
    reanalyzeImageButton: document.getElementById("reanalyzeImageButton"),
    exifStatus: document.getElementById("exifStatus"),
    imageExifCards: document.getElementById("imageExifCards"),
    ocrStatus: document.getElementById("ocrStatus"),
    imageOcrSummary: document.getElementById("imageOcrSummary"),
    imageOcrLines: document.getElementById("imageOcrLines"),
    imageChecklist: document.getElementById("imageChecklist"),
    geoStatus: document.getElementById("geoStatus"),
    geoQueryCount: document.getElementById("geoQueryCount"),
    geoInsights: document.getElementById("geoInsights"),
    geoSearches: document.getElementById("geoSearches"),
    reportSummary: document.getElementById("reportSummary"),
    reportCategories: document.getElementById("reportCategories"),
    reportCategoryCount: document.getElementById("reportCategoryCount"),
    evidenceForm: document.getElementById("evidenceForm"),
    evidenceCount: document.getElementById("evidenceCount"),
    evidenceBoard: document.getElementById("evidenceBoard"),
    evidenceLinkedNodes: document.getElementById("evidenceLinkedNodes"),
    evidenceLinkedRelations: document.getElementById("evidenceLinkedRelations"),
    timelineForm: document.getElementById("timelineForm"),
    timelineCount: document.getElementById("timelineCount"),
    timelineBoard: document.getElementById("timelineBoard"),
    caseVaultCount: document.getElementById("caseVaultCount"),
    caseSearchInput: document.getElementById("caseSearchInput"),
    caseStatusFilter: document.getElementById("caseStatusFilter"),
    casePriorityFilter: document.getElementById("casePriorityFilter"),
    caseArchive: document.getElementById("caseArchive"),
    caseDetail: document.getElementById("caseDetail"),
    taskForm: document.getElementById("taskForm"),
    taskCount: document.getElementById("taskCount"),
    taskBoard: document.getElementById("taskBoard"),
    toast: document.getElementById("toast"),
    viewSwitcher: document.getElementById("viewSwitcher"),
    viewTabs: Array.from(document.querySelectorAll("[data-view]")),
    viewPanels: {
      dashboard: document.getElementById("dashboardView"),
      social: document.getElementById("socialView"),
      images: document.getElementById("imagesView"),
      reports: document.getElementById("reportsView"),
      cases: document.getElementById("casesView"),
    },
    newCaseButton: document.getElementById("newCaseButton"),
    saveCaseButton: document.getElementById("saveCaseButton"),
    exportJsonButton: document.getElementById("exportJsonButton"),
    exportReportButton: document.getElementById("exportReportButton"),
    exportPdfButton: document.getElementById("exportPdfButton"),
    installButton: document.getElementById("installButton"),
  };
}

function bindEvents() {
  dom.form.addEventListener("input", handleFieldMutation);
  dom.form.addEventListener("change", handleFieldMutation);

  dom.imageInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];

    if (!file) {
      updateCurrentCase(
        {
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
          graphFocusId: "",
        },
        { persist: true }
      );
      return;
    }

    try {
      showToast("Analisi immagine in corso...");
      const analysis = await inspectImageFile(file);
      updateCurrentCase(
        {
          imageDataUrl: analysis.previewDataUrl,
          imageName: file.name,
          imageType: file.type || "image/*",
          imageSize: file.size,
          imageUpdatedAt: new Date().toISOString(),
          imageExif: analysis.exif,
          imageOcr: analysis.ocr,
          imageAnalysisUpdatedAt: analysis.analyzedAt,
          graphFocusId: "",
        },
        { persist: true, toastMessage: "Immagine analizzata e collegata al caso." }
      );
    } catch (error) {
      console.error(error);
      showToast("Errore durante l'analisi dell'immagine.");
    }
  });

  dom.reanalyzeImageButton.addEventListener("click", async () => {
    const record = getCurrentCase();
    if (!record?.imageDataUrl) {
      showToast("Carica prima un'immagine.");
      return;
    }

    try {
      showToast("Rianalisi OCR in corso...");
      const analysis = await reanalyzeImageFromDataUrl(record.imageDataUrl);
      updateCurrentCase(
        {
          imageOcr: analysis.ocr,
          imageAnalysisUpdatedAt: analysis.analyzedAt,
        },
        { persist: true, toastMessage: "OCR rianalizzato sul caso corrente." }
      );
    } catch (error) {
      console.error(error);
      showToast("Impossibile rianalizzare l'OCR.");
    }
  });

  dom.clearFocusButton.addEventListener("click", () => {
    updateCurrentCase({ graphFocusId: "" }, { persist: true, touch: false });
  });
  dom.resetGraphLayoutButton.addEventListener("click", resetGraphLayout);

  dom.newCaseButton.addEventListener("click", createNewCase);
  dom.saveCaseButton.addEventListener("click", () => persistCurrentCase("Caso salvato in archivio."));
  dom.exportJsonButton.addEventListener("click", () => handleExport("json"));
  dom.exportReportButton.addEventListener("click", () => handleExport("report"));
  dom.exportPdfButton.addEventListener("click", () => handleExport("pdf"));
  dom.installButton.addEventListener("click", handleInstallClick);
  dom.graphEntityForm.addEventListener("submit", handleGraphEntitySubmit);
  dom.graphRelationForm.addEventListener("submit", handleGraphRelationSubmit);
  dom.resetGraphEntityButton.addEventListener("click", resetGraphEntityForm);
  dom.resetGraphRelationButton.addEventListener("click", resetGraphRelationForm);
  dom.evidenceForm.addEventListener("submit", handleEvidenceSubmit);
  dom.timelineForm.addEventListener("submit", handleTimelineSubmit);
  dom.taskForm.addEventListener("submit", handleTaskSubmit);
  dom.caseSearchInput.addEventListener("input", handleCaseFilterMutation);
  dom.caseStatusFilter.addEventListener("change", handleCaseFilterMutation);
  dom.casePriorityFilter.addEventListener("change", handleCaseFilterMutation);

  dom.viewSwitcher.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) {
      return;
    }

    await setView(button.dataset.view);
  });

  document.body.addEventListener("click", handleDelegatedClick);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    dom.installButton.disabled = false;
    dom.installButton.textContent = "Installa app";
  });

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    dom.installButton.disabled = true;
    dom.installButton.textContent = "App installata";
    showToast("Installazione completata.");
  });
}

function handleFieldMutation(event) {
  const field = event.target.dataset.field;
  if (!field || !getCurrentCase()) {
    return;
  }

  const isTextArea = event.target.tagName === "TEXTAREA";
  const rawValue = event.target.value;
  const value = typeof rawValue === "string" && !isTextArea ? rawValue.trimStart() : rawValue;

  updateCurrentCase({ [field]: value }, { persist: true });
}

function handleGraphEntitySubmit(event) {
  event.preventDefault();
  const record = getCurrentCase();

  if (!record) {
    return;
  }

  const formData = new FormData(dom.graph