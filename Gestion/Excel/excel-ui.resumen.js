// =========================================================
// Archivo: excel-ui.resumen.js
// Ruta: /Gestion/Excel/excel-ui.resumen.js
// Función: UI Sección Resumen (schema + análisis + consolidado + estado de guardado)
// =========================================================
(function (window, document) {
  "use strict";

  function must(name) {
    const x = window[name];
    if (!x) throw new Error(`${name} no disponible.`);
    return x;
  }
  function byId(id) { return document.getElementById(id); }

  let els = {};
  let booted = false;

  function fmtSchema(schema) {
    if (!schema) return "";
    const miss = (schema.missing || []).length ? `Faltan: ${schema.missing.join(", ")}` : "Faltan: —";
    const extra = (schema.extra || []).length ? `Extra: ${schema.extra.join(", ")}` : "Extra: —";
    const crit = (schema.criticalMissing || []).length ? `Críticas: ${schema.criticalMissing.join(", ")}` : "Críticas: —";
    return `${miss}\n${extra}\n${crit}`;
  }

  function calcAnalisis(rows, repo) {
    const totalFilas = (rows || []).length;
    let sinId = 0;
    let duplicados = 0;

    const seen = new Set();
    (rows || []).forEach(r => {
      const id = repo && typeof repo.getRowId === "function" ? repo.getRowId(r) : "";
      if (!id) { sinId++; return; }
      if (seen.has(id)) { duplicados++; return; }
      seen.add(id);
    });

    const validas = Math.max(totalFilas - sinId - duplicados, 0);
    return { totalFilas, validas, duplicados, sinId };
  }

  // --------------------------------------------------------
  // ✅ Estado de guardado legible (sin inventar)
  // - Usa SOLO st.lastSave (éxito) o st.lastError (falla)
  // - Si no hay intento, lo declara como "sin intento"
  // --------------------------------------------------------
  function getSaveStatus(st) {
    const ls = st && st.lastSave ? st.lastSave : null;
    const lastErr = st && st.lastError ? st.lastError : null;

    if (lastErr) {
      return {
        code: "error",
        title: "❌ No guardado",
        detail: String(lastErr)
      };
    }

    // Si hay lastSave y tiene historial, podemos reportar si guardó o no guardó (sin cambios).
    if (ls && ls.historial) {
      const h = ls.historial || {};
      if (h.guardado) {
        return {
          code: "saved",
          title: "✅ Guardado",
          detail: `Historial: versión ${h.version}`
        };
      }
      return {
        code: "nohist",
        title: "⚠️ Guardado parcial",
        // Comentario técnico: el historial puede NO guardarse cuando no hay cambios.
        detail: `No se registró historial: ${h.motivo || "sin cambios"}`
      };
    }

    return {
      code: "none",
      title: "— Sin intento de guardado",
      detail: "Analiza un archivo y presiona Guardar."
    };
  }

  async function refreshFromState() {
    must("ExcelState");
    const st = window.ExcelState.get();

    if (!els.summaryBox) return;

    // Sin período seleccionado
    if (!st.periodoId) {
      if (els.schemaBox) els.schemaBox.style.display = "none";
      els.summaryBox.textContent = "Selecciona un período.";
      return;
    }

    // Sin archivo analizado
    if (!st.rows || !st.rows.length) {
      if (els.schemaBox) els.schemaBox.style.display = "none";
      els.summaryBox.textContent = "Selecciona un período y analiza un archivo.";
      return;
    }

    // Schema + análisis
    let schema = st.schema;
    if (!schema && window.ExcelEstudiantesRepo && typeof window.ExcelEstudiantesRepo.validateHeaders === "function") {
      schema = window.ExcelEstudiantesRepo.validateHeaders(st.headers || []);
      window.ExcelState.set({ schema });
    }

    const analisis = st.analisis || calcAnalisis(st.rows || [], window.ExcelEstudiantesRepo || null);
    if (!st.analisis) window.ExcelState.set({ analisis });

    // Consolidado
    let consolidado = st.consolidado;
    if (!consolidado && window.ExcelLogic && typeof window.ExcelLogic.consolidado === "function") {
      consolidado = window.ExcelLogic.consolidado(st.rows || []);
      window.ExcelState.set({ consolidado });
    }

    // Render schema box
    if (els.schemaBox) {
      els.schemaBox.style.display = "block";
      els.schemaBox.textContent = fmtSchema(schema);
    }

    // Render resumen base
    let txt = "";
    txt += `Período: ${st.periodoLabel || st.periodoId}\n`;
    txt += `Archivo: ${st.fileName || ""}\n\n`;
    txt += `Filas leídas: ${analisis.totalFilas}\n`;
    txt += `Válidas: ${analisis.validas}\n`;
    txt += `Duplicadas: ${analisis.duplicados}\n`;
    txt += `Sin ID: ${analisis.sinId}\n`;

    if (consolidado) {
      txt += `\nTotal estudiantes (consolidado): ${consolidado.totalEstudiantes ?? 0}\n`;
    }

    // --------------------------------------------------------
    // ✅ Estado de guardado (visible en el resumen)
    // Comentario técnico: esto NO cambia el guardado; solo informa lo que ya ocurrió.
    // --------------------------------------------------------
    const saveStatus = getSaveStatus(st);
    txt += `\nEstado de guardado: ${saveStatus.title}\n`;
    txt += `Detalle: ${saveStatus.detail}\n`;

    els.summaryBox.textContent = txt;

    // --------------------------------------------------------
    // ✅ BLOQUE EXTRA (Comparación con versión anterior)
    // + añade alertas con estado de guardado / motivo
    // --------------------------------------------------------
    try {
      const hist = (window.ExcelHistorialRepo && typeof window.ExcelHistorialRepo.listar === "function")
        ? await window.ExcelHistorialRepo.listar(st.periodoId)
        : [];

      const previo = hist.length ? hist[hist.length - 1] : null;

      if (window.ExcelResumenLogic && consolidado) {
        const d = window.ExcelResumenLogic.delta(
          {
            totalEstudiantes: consolidado.totalEstudiantes,
            requisitos: consolidado.requisitos,
            carreras: consolidado.carreras
          },
          previo
        );

        const tops = window.ExcelResumenLogic.topCarreras(consolidado, 5);

        // Base alertas existentes
        const alerts = window.ExcelResumenLogic.alertas(analisis, schema) || [];

        // Comentario técnico: integramos el estado real del guardado dentro de alertas.
        if (saveStatus.code === "saved") {
          alerts.push(saveStatus.detail);
        } else if (saveStatus.code === "nohist") {
          alerts.push(saveStatus.detail);
        } else if (saveStatus.code === "error") {
          alerts.push(`Guardado fallido: ${saveStatus.detail}`);
        } else {
          alerts.push("Aún no se ha intentado guardar.");
        }

        let extra = "\n\nComparación con versión anterior:";
        extra += d.changed ? "\n- Existen cambios detectados" : "\n- Sin cambios globales";

        if (tops.length) {
          extra += "\n\nTop carreras (% cumple todo):";
          tops.forEach(t => (extra += `\n- ${t.carrera}: ${t.porcentaje}%`));
        }

        if (alerts.length) {
          extra += "\n\nAlertas:";
          alerts.forEach(a => (extra += `\n- ${a}`));
        }

        els.summaryBox.textContent += extra;
      }
    } catch (e) {
      // No rompemos el resumen si falla historial/delta
      console.warn("[excel-ui.resumen] bloque extra falló:", e);
    }
  }

  function boot() {
    if (booted) return;
    booted = true;

    els = {
      schemaBox: byId("excel-schema-box"),
      summaryBox: byId("excel-summary-box"),
    };

    if (!els.summaryBox) {
      console.error("[excel-ui.resumen] Faltan elementos del DOM. Revisa IDs en excel.html");
      return;
    }

    must("ExcelState");
    window.ExcelState.on("period:changed", refreshFromState);
    window.ExcelState.on("file:analyzed", refreshFromState);
    window.ExcelState.on("save:done", refreshFromState);
    window.ExcelState.on("delete:done", refreshFromState);
    window.ExcelState.on("change", refreshFromState);

    refreshFromState();
  }

  window.ExcelUIResumen = { boot, refreshFromState };
})(window, document);
