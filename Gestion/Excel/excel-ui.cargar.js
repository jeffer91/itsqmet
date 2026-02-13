// =========================================================
// Archivo: excel-ui.cargar.js
// Ruta: /Gestion/Excel/excel-ui.cargar.js
// Función: UI Sección Cargar Archivo
// - Carga períodos existentes (Firestore)
// - Obliga seleccionar período
// - Botón único: primero analiza, luego guarda
// - ✅ Anuncios mejorados: indica si se guardó, si no, y por qué (real)
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

  function lock(locked) {
    if (els.periodSelect) els.periodSelect.disabled = !!locked;
    if (els.fileInput) els.fileInput.disabled = !!locked;
    if (els.oneBtn) els.oneBtn.disabled = !!locked;
  }

  function enableFileArea(enabled) {
    const ok = !!enabled;
    if (els.fileInput) els.fileInput.disabled = !ok;
    if (els.oneBtn) els.oneBtn.disabled = !ok;
  }

  function setBtnMode(mode) {
    // mode: "analyze" | "save"
    if (!els.oneBtn) return;
    if (mode === "save") els.oneBtn.textContent = "Guardar";
    else els.oneBtn.textContent = "Analizar";
  }

  function fillPeriods(periods, selectedId) {
    els.periodSelect.innerHTML = "";

    if (!periods || !periods.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No hay períodos (crea uno arriba)";
      els.periodSelect.appendChild(opt);
      enableFileArea(false);
      setBtnMode("analyze");
      return;
    }

    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Selecciona un período";
    els.periodSelect.appendChild(opt0);

    periods.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.label || p.id;
      els.periodSelect.appendChild(opt);
    });

    if (selectedId) {
      const idx = Array.from(els.periodSelect.options).findIndex(o => o.value === selectedId);
      if (idx >= 0) els.periodSelect.selectedIndex = idx;
    }

    const hasPid = !!els.periodSelect.value;
    enableFileArea(hasPid);
    setBtnMode("analyze");
  }

  async function refreshPeriods(keepStateSelection = true) {
    must("ExcelPeriodos");
    must("ExcelState");

    lock(true);
    try {
      const periods = await window.ExcelPeriodos.listarTodos();
      const st = window.ExcelState.get();
      const selectedId = keepStateSelection ? (st.periodoId || "") : "";
      fillPeriods(periods, selectedId);

      // si el estado tenía periodoId pero ya no existe, limpiar
      if (keepStateSelection && st.periodoId) {
        const exists = Array.from(els.periodSelect.options).some(o => o.value === st.periodoId);
        if (!exists) {
          window.ExcelState.set({ periodoId: "", periodoLabel: "" });
          window.ExcelState.emit("period:changed", { periodoId: "", periodoLabel: "" });
          enableFileArea(false);
          setBtnMode("analyze");
        }
      }
    } catch (e) {
      console.error("[excel-ui.cargar] refreshPeriods", e);
      // si falla (ej: window.db no existe), bloquea por seguridad
      enableFileArea(false);
      setBtnMode("analyze");
    } finally {
      lock(false);
    }
  }

  function onPeriodSelectChange() {
    must("ExcelState");

    const pid = els.periodSelect.value || "";
    const label = pid
      ? (els.periodSelect.options[els.periodSelect.selectedIndex]?.textContent || pid)
      : "";

    // Cambiar período invalida el análisis anterior
    window.ExcelState.set({
      periodoId: pid,
      periodoLabel: label,
      fileName: "",
      headers: [],
      rows: [],
      readMeta: null,
      schema: null,
      analisis: null,
      consolidado: null,
      resumenRobusto: null,
      lastError: null,
      // Comentario técnico: no tocamos lastSave aquí; el resumen puede mostrar el último guardado.
    });

    window.ExcelState.emit("period:changed", { periodoId: pid, periodoLabel: label });

    enableFileArea(!!pid);
    setBtnMode("analyze");
  }

  async function analizarSolo() {
    must("ExcelState");
    must("ExcelReader");

    const st = window.ExcelState.get();
    const pid = st.periodoId;
    const f = els.fileInput.files[0];

    if (!pid) { alert("Primero selecciona un período existente."); return false; }
    if (!f) { alert("Selecciona un archivo."); return false; }

    lock(true);
    try {
      // Reset parcial
      window.ExcelState.set({
        fileName: "",
        headers: [],
        rows: [],
        readMeta: null,
        schema: null,
        analisis: null,
        consolidado: null,
        resumenRobusto: null,
        lastError: null,
      });

      const data = await window.ExcelReader.readFile(f);
      const sheet = (data.sheets && data.sheets[0]) ? data.sheets[0] : { headers: [], rows: [] };

      window.ExcelState.set({
        fileName: f.name || "",
        headers: sheet.headers || [],
        rows: sheet.rows || [],
        readMeta: { sheets: (data.sheets || []).length, readAtIso: new Date().toISOString() },
      });

      window.ExcelState.emit("file:analyzed", {
        fileName: f.name || "",
        headersCount: (sheet.headers || []).length,
        rowsCount: (sheet.rows || []).length,
      });

      // Comentario técnico: anuncio simple de análisis OK (sin inventar resultados).
      alert(
        "✅ Archivo analizado.\n\n" +
        `Archivo: ${f.name || ""}\n` +
        `Filas: ${(sheet.rows || []).length}\n` +
        `Columnas: ${(sheet.headers || []).length}`
      );

      // tras analizar, dejamos el botón listo para "Guardar"
      setBtnMode("save");
      return true;

    } catch (e) {
      console.error("[excel-ui.cargar] analizarSolo", e);
      window.ExcelState.set({ lastError: e.message || String(e) });
      alert("❌ Error analizando el archivo.\n\nMotivo:\n" + (e.message || "Error analizando el archivo."));
      setBtnMode("analyze");
      return false;
    } finally {
      lock(false);
    }
  }

  async function guardarSolo() {
    must("ExcelState");
    must("ExcelSaveService");

    const st = window.ExcelState.get();
    if (!st.periodoId) { alert("Primero selecciona un período."); return false; }
    if (!st.rows || !st.rows.length) { alert("Primero analiza un archivo."); return false; }

    const ok = confirm(
      "Guardar en Firestore:\n\n" +
      `Período: ${st.periodoLabel || st.periodoId}\n` +
      `Archivo: ${st.fileName || ""}\n\n` +
      "Se hará:\n" +
      "- Upsert estudiantes\n" +
      "- Marcar retirados (si aplica)\n" +
      "- Guardar historial global si hay cambios\n\n" +
      "¿Continuar?"
    );
    if (!ok) return false;

    lock(true);
    try {
      const res = await window.ExcelSaveService.guardarActual();

      // ✅ Importante: si hubo un error anterior, lo limpiamos al guardar OK
      // (evita que el Resumen muestre "No guardado" por un error viejo).
      window.ExcelState.set({ lastError: null });

      const h = res.historial || {};
      const histMsg = h.guardado
        ? `✅ Historial guardado (versión ${h.version})`
        : `⚠️ Historial NO guardado: ${h.motivo || "sin cambios"}`;

      const r = res.retirados;
      const retMsg = (r && typeof r.retirados !== "undefined")
        ? `Retirados marcados: ${r.retirados}`
        : "Retirados: (no aplicado)";

      // Comentario técnico: el upsert es la evidencia directa de escritura intentada.
      // res.upsert.escritos viene del repo que hace batch.commit().
      alert(
        "Resultado de guardado:\n\n" +
        `✅ Estudiantes guardados/actualizados: ${res.upsert.escritos}\n` +
        `Filas leídas: ${res.upsert.totalFilas}\n` +
        `Válidas: ${res.upsert.validas}\n` +
        `Duplicadas: ${res.upsert.duplicados}\n` +
        `Sin ID: ${res.upsert.sinId}\n\n` +
        `${retMsg}\n\n` +
        `${histMsg}`
      );

      // después de guardar, vuelve a modo analizar (por si sube otro archivo)
      setBtnMode("analyze");
      return true;

    } catch (e) {
      console.error("[excel-ui.cargar] guardarSolo", e);
      const msg = e?.message || String(e);

      window.ExcelState.set({ lastError: msg });

      // ✅ Anuncio claro: no se guardó y se indica el motivo real (error)
      alert("❌ No se guardó.\n\nMotivo:\n" + msg);

      // si falla guardado, mantenemos en modo guardar
      setBtnMode("save");
      return false;
    } finally {
      lock(false);
    }
  }

  async function onAnalyzeSaveClick() {
    must("ExcelState");
    const st = window.ExcelState.get();

    // Si no hay filas en memoria -> analizar
    if (!st.rows || !st.rows.length) {
      await analizarSolo();
      return;
    }

    // Si ya hay filas -> guardar
    await guardarSolo();
  }

  function boot() {
    if (booted) return;
    booted = true;

    els = {
      periodSelect: byId("excel-cargar-period-select"),
      fileInput: byId("excel-file-input"),
      oneBtn: byId("excel-analyze-save-btn"),
    };

    if (!els.periodSelect || !els.fileInput || !els.oneBtn) {
      console.error("[excel-ui.cargar] Faltan elementos del DOM. Revisa IDs en excel.html");
      return;
    }

    // Estado inicial
    enableFileArea(false);
    setBtnMode("analyze");

    els.periodSelect.addEventListener("change", onPeriodSelectChange);
    els.oneBtn.addEventListener("click", onAnalyzeSaveClick);

    // Cargar períodos existentes al iniciar
    refreshPeriods(true);

    // Si se crea un período arriba, refrescar para que aparezca
    must("ExcelState");
    window.ExcelState.on("period:changed", () => {
      // refrescamos la lista para reflejar nuevos periodos creados
      refreshPeriods(true);
    });
  }

  window.ExcelUICargar = {
    boot,
    refreshPeriods,
    analizarSolo,
    guardarSolo
  };

})(window, document);
