// =========================================================
// Archivo: excel-historial.ui.detalle.js
// Ruta: /Gestion/Excel/excel-historial.ui.detalle.js
// Función: Mostrar detalle de una versión del historial
// =========================================================
(function (window, document) {
  "use strict";

  function renderDetalle(h) {
    return `
      Versión: ${h.version}
      Fecha: ${h.fechaTxt}
      Total estudiantes: ${h.totalEstudiantes}

      Requisitos:
      ${JSON.stringify(h.requisitos, null, 2)}

      Carreras:
      ${JSON.stringify(h.carreras, null, 2)}
    `;
  }

  window.ExcelHistorialUIDetalle = {
    mostrar(h) {
      alert(renderDetalle(h));
    }
  };
})(window, document);
