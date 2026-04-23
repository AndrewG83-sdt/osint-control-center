o",
      imageDataUrl: "Immagine",
    };

    Object.entries(fieldLabels).forEach(([field, label]) => {
      if (record[field]) {
        const value =
          field === "imageDataUrl" ? record.imageName || "Immagine collegata" : record[field];
        labels[`field:${field}`] = `${label}: ${value}`;
      }
    });

    (record.graphEntities || []).forEach((entity) => {
      labels[entity.id] = entity.label || entity.value || entity.type || entity.id;
    });

    return labels;
  }

  function getGraphNodeLabel(labels, id) {
    return labels?.[id] || id || "-";
  }

  function buildGraphRelationLabels(record) {
    const graphNodeLabels = buildGraphNodeLabels(record);
    const labels = {};

    (record.graphRelations || []).forEach((relation) => {
      labels[relation.id] = `${getGraphNodeLabel(graphNodeLabels, relation.sourceId)} -> ${getGraphNodeLabel(graphNodeLabels, relation.targetId)} (${relation.label || "relazione"})`;
    });

    return labels;
  }

  function renderPdfTimelineList(timeline) {
    if (!timeline.length) {
      return `<div class="notes-box">Nessun evento timeline registrato.</div>`;
    }

    return timeline
      .map(
        (item) => `
          <article class="query-item">
            <div class="query-topline">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="tag">${escapeHtml(item.category)}</span>
            </div>
            <p class="query-description">${escapeHtml(formatTimelineLabel(item))}</p>
            <div class="query-code">${escapeHtml(item.description || "Nessuna descrizione.")}</div>
          </article>
        `
      )
      .join("");
  }

  function renderPdfTaskList(tasks) {
    if (!tasks.length) {
      return `<div class="notes-box">Nessun task operativo registrato.</div>`;
    }

    return tasks
      .map(
        (item) => `
          <article class="query-item">
            <div class="query-topline">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="tag">${escapeHtml(formatTaskStatusLabel(item.status))}</span>
            </div>
            <p class="query-description">Priorita: ${escapeHtml(formatTaskPriorityLabel(item.priority))} / Scadenza: ${escapeHtml(item.dueDate || "-")}</p>
            <div class="query-code">${escapeHtml(item.notes || "Nessuna nota task.")}</div>
          </article>
        `
      )
      .join("");
  }

  function compareTimelineEntries(left, right) {
    return new Date(buildTimelineSortKey(left)) - new Date(buildTimelineSortKey(right));
  }

  function buildTimelineSortKey(entry) {
    const date = entry.date || "1970-01-01";
    const time = entry.time || "00:00";
    return `${date}T${time}:00`;
  }

  function formatTimelineLabel(entry) {
    return `${entry.date || "-"} ${entry.time || ""}`.trim() || "-";
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

  window.OSINT_EXPORTS = {
    buildExportPayload,
    exportJson,
    exportReport,
    exportPdf,
  };
})();
