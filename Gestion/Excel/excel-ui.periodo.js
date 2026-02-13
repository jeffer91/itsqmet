// =========================================================
// Archivo: excel-ui.periodo.js
// Ruta: /Gestion/Excel/excel-ui.periodo.js
// Función: UI Sección Período (MINIMAL: crear período)
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
    if (els.addBtn) els.addBtn.disabled = !!locked;
  }

  function num(v) {
    const n = parseInt(String(v ?? "").trim(), 10);
    return Number.isFinite(n) ? n : NaN;
  }

  function isValidMonth(m) { return Number.isFinite(m) && m >= 1 && m <= 12; }
  function isValidYear(y) { return Number.isFinite(y) && y >= 2000 && y <= 2100; }

  function comparePeriod(iniA, iniM, finA, finM) {
    const a = (iniA * 100) + iniM;
    const b = (finA * 100) + finM;
    return b >= a;
  }

  function parseIdToKey(id) {
    // Espera id: "iniA-iniM_finA-finM" (ej: 2026-1_2026-3)
    const s = String(id || "");
    const m = s.match(/^(\d{4})-(\d{1,2})_(\d{4})-(\d{1,2})$/);
    if (!m) return -1;
    const iniA = parseInt(m[1], 10);
    const iniM = parseInt(m[2], 10);
    const finA = parseInt(m[3], 10);
    const finM = parseInt(m[4], 10);
    return ((iniA * 100 + iniM) * 10000) + (finA * 100 + finM);
  }

  function pickMostRecentPeriod(periods) {
    if (!periods || !periods.length) return null;
    const sorted = periods.slice().sort((a, b) => parseIdToKey(a.id) - parseIdToKey(b.id));
    return sorted[sorted.length - 1];
  }

  async function refreshSilent() {
    // No UI, solo setea state para que el resto del sistema funcione
    must("ExcelPeriodos");
    must("ExcelState");

    try {
      const periods = await window.ExcelPeriodos.listarTodos();
      if (!periods || !periods.length) {
        window.ExcelState.set({ periodoId: "", periodoLabel: "" });
        window.ExcelState.emit("period:changed", { periodoId: "", periodoLabel: "" });
        return;
      }

      const st = window.ExcelState.get();
      const found = st.periodoId ? periods.find(p => p.id === st.periodoId) : null;
      const chosen = found || pickMostRecentPeriod(periods);

      const pid = chosen ? chosen.id : "";
      const label = chosen ? (chosen.label || chosen.id) : "";

      window.ExcelState.set({ periodoId: pid, periodoLabel: label });
      window.ExcelState.emit("period:changed", { periodoId: pid, periodoLabel: label });
    } catch (e) {
      console.error("[excel-ui.periodo] refreshSilent", e);
    }
  }

  async function createPeriodFromUI() {
    must("ExcelPeriodos");

    const iniM = num(els.iniM.value);
    const iniA = num(els.iniA.value);
    const finM = num(els.finM.value);
    const finA = num(els.finA.value);

    if (!isValidMonth(iniM) || !isValidMonth(finM) || !isValidYear(iniA) || !isValidYear(finA)) {
      alert("Completa el período correctamente (mes 1-12 y año 2000-2100).");
      return;
    }

    if (!comparePeriod(iniA, iniM, finA, finM)) {
      alert("El fin del período no puede ser menor que el inicio.");
      return;
    }

    lock(true);
    try {
      await window.ExcelPeriodos.crear(iniA, iniM, finA, finM);
      // Luego de crear, dejamos el período más reciente como activo (sin mostrar selector)
      await refreshSilent();
    } catch (e) {
      console.error("[excel-ui.periodo] crear período", e);
      alert(e.message || "No se pudo crear el período.");
    } finally {
      lock(false);
    }
  }

  function boot() {
    if (booted) return;
    booted = true;

    els = {
      iniM: byId("inicioMes"),
      iniA: byId("inicioAnio"),
      finM: byId("finMes"),
      finA: byId("finAnio"),
      addBtn: byId("excel-add-period-btn"),
    };

    if (!els.iniM || !els.iniA || !els.finM || !els.finA || !els.addBtn) {
      console.error("[excel-ui.periodo] Faltan elementos del DOM. Revisa IDs en excel.html");
      return;
    }

    els.addBtn.addEventListener("click", createPeriodFromUI);

    // Inicializa periodoId silenciosamente para que otras pantallas funcionen
    refreshSilent();
  }

  window.ExcelUIPeriodo = { boot };
})(window, document);
