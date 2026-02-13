// tabla-bus.js
// ORQUESTADOR DE LA PANTALLA TABLA
// ----------------------------------------------
// Define servicios de alto nivel que usa la UI:
//
//  - cargarPeriodos()                 → devuelve lista de períodos (objetos)
//  - getPeriodos()                    → alias para el selector de períodos
//  - cargarEstudiantesPorPeriodo(pid) → estudiantes por período
//  - guardarObservaciones(array)      → guarda observaciones en Firestore
//
// Depende exclusivamente de tabla-firebase.js
//

(function (window) {
  "use strict";

  const FB = window.TablaFirebase;

  // -----------------------------------------------------
  // Cargar períodos (UI → BUS → Firebase)
  // Devuelve un array de objetos:
  //   { id, label, creadoEn }
  // -----------------------------------------------------
  async function cargarPeriodos() {
    const periods = await FB.obtenerPeriodos();
    return periods || [];
  }

  // Alias utilizado por tabla-selector.js
  async function getPeriodos() {
    return await cargarPeriodos();
  }

  // -----------------------------------------------------
  // Cargar estudiantes de un período
  // -----------------------------------------------------
  async function cargarEstudiantesPorPeriodo(periodoId) {
    if (!periodoId) return [];
    const rows = await FB.obtenerEstudiantes(periodoId);
    return rows || [];
  }

  // -----------------------------------------------------
  // Guardar observaciones (arreglo de { id, observacion })
  // -----------------------------------------------------
  async function guardarObservaciones(obsArray) {
    if (!Array.isArray(obsArray) || obsArray.length === 0) return;
    await FB.guardarObservaciones(obsArray);
  }

  // -----------------------------------------------------
  // EXPORTAR API
  // -----------------------------------------------------
  window.TablaBus = {
    cargarPeriodos,
    getPeriodos,
    cargarEstudiantesPorPeriodo,
    guardarObservaciones
  };

})(window);
