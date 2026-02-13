// =========================================================
// Archivo: excel-save.service.js
// Ruta: /Gestion/Excel/excel-save.service.js
// Función: Guardado orquestado (Estudiantes + Estados + Historial)
// =========================================================
(function (window) {
  "use strict";

  function must(name) {
    const x = window[name];
    if (!x) throw new Error(`${name} no disponible.`);
    return x;
  }

  async function guardarActual() {
    must("ExcelState");
    must("ExcelEstudiantesRepo");
    must("ExcelHistorialRepo");
    // Estados (retiros) puede ser opcional según tu implementación actual
    // Si existe ExcelEstados, lo usamos; si no, no rompe.
    const Estados = window.ExcelEstados || null;

    const st = window.ExcelState.get();
    if (!st.periodoId) throw new Error("Selecciona un período.");
    if (!st.rows || !st.rows.length) throw new Error("No hay filas para guardar. Analiza un archivo.");

    // Validación crítica
    const schema = st.schema || window.ExcelEstudiantesRepo.validateHeaders(st.headers || []);
    if (schema.criticalMissing && schema.criticalMissing.length) {
      throw new Error("Faltan columnas críticas. Corrige el archivo antes de guardar.");
    }

    // 1) Upsert estudiantes
    const up = await window.ExcelEstudiantesRepo.upsert(st.periodoId, st.rows, st.headers);

    // 2) Marcar retirados (si existe)
    let retirados = null;
    try {
      if (Estados && typeof Estados.marcarRetirados === "function") {
        retirados = await Estados.marcarRetirados(st.periodoId);
      }
    } catch (e) {
      console.warn("[excel-save.service] marcarRetirados falló (se continúa):", e);
    }

    // 3) Guardar historial global si hubo cambios
    const consolidado = st.consolidado || (window.ExcelLogic ? window.ExcelLogic.consolidado(st.rows) : null);
    const meta = {
      fileName: st.fileName || "",
      schemaOk: !!schema.ok,
      validas: up.validas,
      duplicados: up.duplicados,
      sinId: up.sinId,
      totalFilas: up.totalFilas,
      retirados: retirados?.retirados ?? null,
      savedAtIso: new Date().toISOString(),
    };

    const hist = await window.ExcelHistorialRepo.guardarSiCambio(st.periodoId, consolidado, meta);

    const out = {
      upsert: up,
      retirados,
      historial: hist,
    };

    window.ExcelState.set({ lastSave: out });
    window.ExcelState.emit("save:done", out);

    return out;
  }

  window.ExcelSaveService = { guardarActual };
})(window);
