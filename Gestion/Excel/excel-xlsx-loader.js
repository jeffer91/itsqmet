// =========================================================
// Archivo: excel-xlsx-loader.js
// Ruta: /Gestion/Excel/excel-xlsx-loader.js
// Función: Asegura window.XLSX (SheetJS) antes de usar ExcelReader
// - Si XLSX ya existe, no hace nada.
// - Si no existe, lo carga desde CDN.
// =========================================================
(function (window, document) {
  "use strict";

  const XLSX_URLS = [
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false; // importante: mantener orden de carga
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("No se pudo cargar: " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureXLSX() {
    if (window.XLSX) return true;

    for (let i = 0; i < XLSX_URLS.length; i++) {
      try {
        await loadScript(XLSX_URLS[i]);
        if (window.XLSX) {
          console.log("[XLSX Loader] XLSX listo:", XLSX_URLS[i]);
          return true;
        }
      } catch (e) {
        console.warn("[XLSX Loader] Falló CDN:", XLSX_URLS[i], e);
      }
    }

    throw new Error("XLSX no está disponible. Revisa conexión o bloqueos de red.");
  }

  // Exponer para debug/uso manual
  window.ExcelXlsxLoader = { ensureXLSX };

  // Auto-ejecutar al cargar el archivo (sin bloquear la UI con alert aquí)
  ensureXLSX().catch(err => {
    console.error("[XLSX Loader] Error crítico:", err);
  });
})(window, document);
