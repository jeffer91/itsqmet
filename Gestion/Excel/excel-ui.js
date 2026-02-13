// =========================================================
// Archivo: excel-ui.js
// Ruta: /Gestion/Excel/excel-ui.js
// Función: Bootstrap UI (monta las 5 secciones)
// =========================================================
(function (window) {
  "use strict";

  function must(name) {
    const x = window[name];
    if (!x) throw new Error(`${name} no disponible.`);
    return x;
  }

  function boot() {
    must("ExcelUIPeriodo").boot();
    must("ExcelUICargar").boot();
    must("ExcelUIResumen").boot();
    must("ExcelUIBorrado").boot();
    must("ExcelUIHistorial").boot();
  }

  window.ExcelUI = { boot };
})(window);
