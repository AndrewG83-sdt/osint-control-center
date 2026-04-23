(() => {
  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function truncate(value, maxLength) {
    if (!value || value.length <= maxLength) {
      return value || "";
    }

    return `${value.slice(0, maxLength - 3)}...`;
  }

  function addAlpha(hexColor, alpha) {
    const hex = hexColor.replace("#", "");
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function formatBytes(bytes) {
    if (!bytes) {
      return "-";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatDate(iso) {
    if (!iso) {
      return "-";
    }

    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  }

  function formatCoordinateValue(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "";
    }

    return value.toFixed(6);
  }

  function isSafeImageDataUrl(value) {
    if (typeof value !== "string") {
      return false;
    }

    return /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value.trim());
  }

  function getSafeImageDataUrl(value) {
    return isSafeImageDataUrl(value) ? value.trim() : "";
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function makeGoogleUrl(query) {
    return `https://www.google.com/search?q=${encodeURIComponent(String(query).trim())}`;
  }

  function makeGoogleImagesUrl(query) {
    return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(String(query).trim())}`;
  }

  function quote(text) {
    return `"${String(text).trim()}"`;
  }

  function normalizePhone(phone) {
    const digits = phone.replace(/[^\d+]/g, "");
    const compact = digits.replace(/\s+/g, "");
    const noPlus = compact.replace(/^\+/, "");
    return {
      digits: noPlus,
      variants: Array.from(new Set([phone, compact, noPlus].filter(Boolean))),
    };
  }

  function parseTags(tags) {
    return String(tags || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function countIdentifiers(record) {
    const { FIELD_LABELS } = window.OSINT_CONFIG;

    return Object.keys(FIELD_LABELS).filter((key) => Boolean(record[key])).length;
  }

  function hasCaseContent(record) {
    return Boolean(
      record.caseName ||
        record.name ||
        record.surname ||
        record.username ||
        record.email ||
        record.phone ||
        record.location ||
        record.notes ||
        record.imageDataUrl
    );
  }

  function sortCasesByUpdatedAt(cases) {
    return [...cases].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  window.OSINT_UTILS = {
    safeParse,
    truncate,
    addAlpha,
    formatBytes,
    formatDate,
    formatCoordinateValue,
    isSafeImageDataUrl,
    getSafeImageDataUrl,
    escapeHtml,
    slugify,
    downloadFile,
    makeGoogleUrl,
    makeGoogleImagesUrl,
    quote,
    normalizePhone,
    parseTags,
    countIdentifiers,
    hasCaseContent,
    sortCasesByUpdatedAt,
  };
})();
