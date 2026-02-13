// =========================================================
// Archivo: excel-resumen.logic.js
// Ruta: /Gestion/Excel/excel-resumen.logic.js
// Función: Lógica avanzada de resumen (deltas, tops, alertas)
// =========================================================
(function (window) {
  "use strict";

  function delta(actual, previo) {
    if (!previo) return { changed: true, delta: actual };

    const out = { changed: false, delta: {} };

    if (actual.totalEstudiantes !== previo.totalEstudiantes) {
      out.changed = true;
      out.delta.totalEstudiantes = {
        before: previo.totalEstudiantes,
        now: actual.totalEstudiantes
      };
    }

    ["requisitos", "carreras"].forEach(k => {
      const a = actual[k] || {};
      const b = previo[k] || {};
      Object.keys(a).forEach(key => {
        if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
          out.changed = true;
          out.delta[k] = out.delta[k] || {};
          out.delta[k][key] = { before: b[key], now: a[key] };
        }
      });
    });

    return out;
  }

  function topCarreras(consolidado, limit = 5) {
    const carr = consolidado.carreras || {};
    return Object.keys(carr)
      .map(k => ({
        carrera: k,
        total: carr[k].total || 0,
        cumpleTodo: carr[k].cumpleTodo || 0,
        porcentaje: carr[k].porcentaje || 0
      }))
      .sort((a, b) => b.porcentaje - a.porcentaje)
      .slice(0, limit);
  }

  function alertas(analisis, schema) {
    const a = [];
    if ((analisis.sinId / Math.max(analisis.totalFilas, 1)) > 0.05)
      a.push("Más del 5% de filas sin identificación.");
    if (analisis.duplicados > 0)
      a.push("Existen duplicados que fueron ignorados.");
    if (schema?.criticalMissing?.length)
      a.push("Faltan columnas críticas en el archivo.");
    return a;
  }

  window.ExcelResumenLogic = {
    delta,
    topCarreras,
    alertas
  };
})(window);
