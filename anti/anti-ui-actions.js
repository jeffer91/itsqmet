/* =========================================================
Archivo: anti-ui-actions.js
Ubicación: anti/anti-ui-actions.js
Función: Acciones de UI (descargar seleccionados / descargar todos).
========================================================= */

(function (window, document) {
  "use strict";

  const AntiUIActions = {
    bind(onDownloadSelected, onDownloadAll) {
      const btnSel = document.getElementById("btn-download-selected");
      const btnAll = document.getElementById("btn-download-all");

      if (btnSel) btnSel.addEventListener("click", onDownloadSelected);
      if (btnAll) btnAll.addEventListener("click", onDownloadAll);
    }
  };

  window.AntiUIActions = AntiUIActions;
})(window, document);
