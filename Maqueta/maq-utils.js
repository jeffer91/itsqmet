// Archivo: maq-utils.js
// Utilidad: Funciones auxiliares reutilizables para el maquetador y la configuración del menú.
// Cambios:
// - Agrega helpers de navegación (keys) para recordar módulo actual/anterior.

(function (window) {
  "use strict";

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function ordenarPorCampo(arr, campo) {
    return arr.slice().sort(function (a, b) {
      var va = a[campo];
      var vb = b[campo];
      if (va === vb) return 0;
      return va < vb ? -1 : 1;
    });
  }

  function guardarLocal(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (err) {
      console.warn("[MAQ_UTILS] No se pudo guardar en localStorage:", clave, err);
    }
  }

  function leerLocal(clave) {
    try {
      var raw = localStorage.getItem(clave);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn("[MAQ_UTILS] No se pudo leer de localStorage:", clave, err);
      return null;
    }
  }

  function normalizarEtiqueta(str) {
    if (!str) return "";
    return String(str).trim();
  }

  var NAV_KEYS = {
    ultimoModuloId: "MAQ_NAV_ULTIMO_MODULO_ID",
    anteriorModuloId: "MAQ_NAV_ANTERIOR_MODULO_ID",
    historial: "MAQ_NAV_HISTORIAL"
  };

  function guardarNavState(estado) {
    if (!estado || typeof estado !== "object") return;
    guardarLocal(NAV_KEYS.historial, estado);
  }

  function leerNavState() {
    return leerLocal(NAV_KEYS.historial) || null;
  }

  window.MAQ_UTILS = {
    clonar: clonar,
    ordenarPorCampo: ordenarPorCampo,
    guardarLocal: guardarLocal,
    leerLocal: leerLocal,
    normalizarEtiqueta: normalizarEtiqueta,
    NAV_KEYS: NAV_KEYS,
    guardarNavState: guardarNavState,
    leerNavState: leerNavState
  };
})(window);
