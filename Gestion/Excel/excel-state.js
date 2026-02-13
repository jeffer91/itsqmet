// =========================================================
// Archivo: excel-state.js
// Ruta: /Gestion/Excel/excel-state.js
// Función: Estado central + eventos (pub/sub)
// =========================================================
(function (window) {
  "use strict";

  const _state = {
    // UI / selección
    periodoId: "",
    periodoLabel: "",

    // Archivo
    fileName: "",
    headers: [],
    rows: [],
    readMeta: null,

    // Reportes
    schema: null,         // {ok, missing, extra, expected, criticalMissing}
    analisis: null,       // {totalFilas, validas, duplicados, sinId}
    consolidado: null,    // {totalEstudiantes, requisitos, carreras}
    resumenRobusto: null, // extra

    // Últimas operaciones
    lastSave: null,
    lastError: null,
  };

  const _listeners = {};

  function emit(evt, payload) {
    const list = _listeners[evt] || [];
    list.forEach(fn => {
      try { fn(payload, get()); } catch (e) { console.error("[ExcelState] listener error", e); }
    });
  }

  function on(evt, fn) {
    if (!_listeners[evt]) _listeners[evt] = [];
    _listeners[evt].push(fn);
    return () => {
      _listeners[evt] = (_listeners[evt] || []).filter(x => x !== fn);
    };
  }

  function set(patch) {
    Object.assign(_state, patch || {});
    emit("change", patch || {});
    return get();
  }

  function reset(keys) {
    if (!keys) {
      Object.keys(_state).forEach(k => (_state[k] = Array.isArray(_state[k]) ? [] : ""));
      _state.readMeta = null;
      _state.schema = null;
      _state.analisis = null;
      _state.consolidado = null;
      _state.resumenRobusto = null;
      _state.lastSave = null;
      _state.lastError = null;
      emit("reset", null);
      return get();
    }
    (keys || []).forEach(k => {
      if (k in _state) _state[k] = Array.isArray(_state[k]) ? [] : "";
    });
    emit("reset", keys);
    return get();
  }

  function get() {
    // copia superficial para evitar mutaciones externas
    return Object.assign({}, _state);
  }

  window.ExcelState = { get, set, reset, on, emit };
})(window);
