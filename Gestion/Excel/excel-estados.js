// =========================================================
// Archivo: excel-estados.js
// Ruta: /Gestion/Excel/excel-estados.js
// Función: Estados de matrícula (retiros) - wrapper modular
// =========================================================
(function (window) {
  "use strict";

  // Si ya existe un ExcelEstados anterior, lo respetamos y extendemos.
  const ExcelEstados = window.ExcelEstados || {};

  /**
   * marcarRetirados(periodoId)
   * Debe marcar como RETIRADO a quienes NO están presentes en el Excel actual del periodo,
   * o según la regla que tú ya manejas.
   *
   * Como no estamos viendo tu implementación previa, este wrapper:
   * - intenta delegar a una función existente si está presente
   * - si no existe, devuelve 0 y no rompe
   */
  ExcelEstados.marcarRetirados = async function (periodoId) {
    try {
      // Si en tu versión anterior existe otra función, la llamamos:
      if (typeof ExcelEstados.syncRetirados === "function") {
        return await ExcelEstados.syncRetirados(periodoId);
      }
      if (typeof ExcelEstados.actualizarRetirados === "function") {
        return await ExcelEstados.actualizarRetirados(periodoId);
      }

      // Si no existe lógica previa, devolvemos "no-op".
      return { retirados: 0, modo: "noop" };
    } catch (e) {
      console.error("[excel-estados] marcarRetirados error", e);
      throw e;
    }
  };

  window.ExcelEstados = ExcelEstados;
})(window);
