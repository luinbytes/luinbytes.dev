document.documentElement.dataset.pondBoot = "pending";

const restorePondFallback = () => {
  delete document.documentElement.dataset.pondBoot;
};

window.addEventListener("error", (event) => {
  if (event.target instanceof HTMLScriptElement || event instanceof ErrorEvent) {
    restorePondFallback();
  }
}, true);

window.setTimeout(restorePondFallback, 15000);
