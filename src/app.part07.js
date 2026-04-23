

    if (kind === "report") {
      exportReport(record);
      showToast("Report markdown esportato.");
      return;
    }

    exportPdf(record);
    showToast("Report PDF aperto. Usa Salva come PDF nella finestra di stampa.");
  } catch (error) {
    console.error(error);
    showToast("Impossibile completare l'esportazione richiesta.");
  }
}

async function handleInstallClick() {
  if (state.deferredInstallPrompt) {
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    return;
  }

  showToast("Apri la web app da localhost e usa il comando di installazione del browser se disponibile.");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Contenuto copiato.");
  } catch {
    showToast("Clipboard non disponibile.");
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("visible");

  toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("visible");
  }, 2200);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch(() => {
    showToast("Service worker non registrato.");
  });
}
