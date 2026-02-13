// =========================================================
// Archivo: excel-delete.service.js
// Ruta: /Gestion/Excel/excel-delete.service.js
// Función: Servicio de borrado (solo alumnos / período completo)
// =========================================================
(function (window) {
  "use strict";

  function must(name) {
    const x = window[name];
    if (!x) throw new Error(`${name} no disponible.`);
    return x;
  }

  function ensureDb() {
    if (!window.db) throw new Error("Firestore no inicializado (window.db). Revisa excel.html.");
    return window.db;
  }

  async function borrarSoloAlumnos(periodoId) {
    must("ExcelEstudiantesRepo");
    const res = await window.ExcelEstudiantesRepo.borrarPorPeriodo(periodoId);
    return { ok: true, eliminados: res.eliminados || 0 };
  }

  async function borrarPeriodoCompleto(periodoId) {
    // ✅ Orden correcto:
    // 1) alumnos
    // 2) historial
    // 3) periodo
    must("ExcelEstudiantesRepo");
    must("ExcelHistorialRepo");
    must("ExcelConstants");

    const alumnos = await window.ExcelEstudiantesRepo.borrarPorPeriodo(periodoId);
    const hist = await window.ExcelHistorialRepo.borrarPorPeriodo(periodoId);

    // borrar doc del periodo
    const db = ensureDb();
    const col = window.ExcelConstants.COL.PERIODOS;
    await db.collection(col).doc(periodoId).delete();

    return {
      ok: true,
      eliminadosAlumnos: alumnos.eliminados || 0,
      eliminadosHistorial: hist.eliminados || 0,
      periodoEliminado: true
    };
  }

  window.ExcelDeleteService = {
    borrarSoloAlumnos,
    borrarPeriodoCompleto
  };
})(window);
