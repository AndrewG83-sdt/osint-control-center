const HTML_PARTS = [
  "./src/index.part01.html",
  "./src/index.part02.html",
  "./src/index.part03.html",
];

const STYLE_PARTS = [
  "./src/styles.part01.css",
  "./src/styles.part02.css",
];

const DIRECT_SCRIPTS = [
  "./js/config.js",
  "./js/utils.js",
  "./js/storage.js",
];

const CHUNKED_SCRIPTS = [
  {
    label: "searches.js",
    parts: [
      "./src/js/searches.part01.js",
      "./src/js/searches.part02.js",
      "./src/js/searches.part03.js",
      "./src/js/searches.part04.js",
    ],
  },
  {
    label: "image.js",
    parts: [
      "./src/js/image.part01.js",
      "./src/js/image.part02.js",
    ],
  },
  {
    label: "graph.js",
    parts: [
      "./src/js/graph.part01.js",
      "./src/js/graph.part02.js",
    ],
  },
  {
    label: "exports.js",
    parts: [
      "./src/js/exports.part01.js",
      "./src/js/exports.part02.js",
      "./src/js/exports.part03.js",
    ],
  },
  {
    label: "app.js",
    parts: [
      "./src/app.part01.js",
      "./src/app.part02.js",
      "./src/app.part03.js",
      "./src/app.part04.js",
      "./src/app.part05.js",
      "./src/app.part06.js",
      "./src/app.part07.js",
    ],
  },
];

function setStatus(message) {
  const statusText = document.getElementById("bootStatusText");
  if (statusText) {
    statusText.textContent = message;
  }
}

async function fetchText(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.text();
}

async function fetchJoined(parts) {
  const chunks = [];
  for (const part of parts) {
    chunks.push(await fetchText(part));
  }

  return chunks.join("");
}

function mountMarkup(html) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  parsed.querySelectorAll("script").forEach((node) => node.remove());

  const mount = document.getElementById("bootMount");
  mount.replaceChildren();

  Array.from(parsed.body.childNodes).forEach((node) => {
    mount.appendChild(document.importNode(node, true));
  });
}

function injectStyles(css) {
  const existing = document.getElementById("osint-inline-styles");
  if (existing) {
    existing.remove();
  }

  const style = document.createElement("style");
  style.id = "osint-inline-styles";
  style.textContent = css;
  document.head.appendChild(style);
}

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.body.appendChild(script);
  });
}

function injectInlineScript(code, label) {
  const script = document.createElement("script");
  script.text = `${code}\n//# sourceURL=${label}`;
  document.body.appendChild(script);
}

async function loadScripts() {
  for (const src of DIRECT_SCRIPTS) {
    setStatus(`Carico ${src.replace("./", "")}`);
    await loadExternalScript(src);
  }

  for (const entry of CHUNKED_SCRIPTS) {
    setStatus(`Ricompongo ${entry.label}`);
    const source = await fetchJoined(entry.parts);
    injectInlineScript(source, entry.label);
  }
}

async function boot() {
  try {
    setStatus("Ricostruzione interfaccia in corso...");
    const [markup, styles] = await Promise.all([
      fetchJoined(HTML_PARTS),
      fetchJoined(STYLE_PARTS),
    ]);

    mountMarkup(markup);
    injectStyles(styles);

    setStatus("Caricamento moduli applicativi...");
    await loadScripts();

    document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("load"));
    });

    const overlay = document.getElementById("bootStatus");
    if (overlay) {
      overlay.remove();
    }
  } catch (error) {
    console.error(error);
    setStatus(`Bootstrap non riuscito: ${error.message}`);
  }
}

document.addEventListener("DOMContentLoaded", boot, { once: true });
