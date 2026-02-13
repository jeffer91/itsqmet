// Archivo: maq-core.js
// Utilidad: Motor central del maquetador. Mantiene el estado global, el bus de eventos
// y el router para cargar módulos HTML dentro del maquetador.
//
// Cambios (cache real):
// - En vez de 1 iframe, usa un POOL de iframes por moduloId dentro de #maq-main-frame-host
// - No recarga al cambiar de pestaña: oculta/muestra iframes.
// - Guarda en localStorage: último módulo y módulo anterior
//
// Cambios (REFRESH manual):
// - Botón "Refrescar" para recargar el módulo activo cuando tú lo desees
// - La recarga se fuerza con un cache-buster en la URL del iframe, sin tocar la ruta base

(function (window, document) {
  "use strict";

  var utils = window.MAQ_UTILS;

  var state = {
    menuActivoId: null,
    moduloActivoId: null,
    moduloAnteriorId: null
  };

  var listeners = {};

  function on(evento, handler) {
    if (!listeners[evento]) listeners[evento] = [];
    listeners[evento].push(handler);
  }

  function emit(evento, payload) {
    if (!listeners[evento]) return;
    listeners[evento].forEach(function (h) {
      try { h(payload); }
      catch (err) { console.error("[MAQ_CORE] Error en handler de evento", evento, err); }
    });
  }

  function actualizarEtiquetaModulo(nombre) {
    var estadoLabel = document.getElementById("maq-current-module-label");
    if (!estadoLabel) return;
    estadoLabel.textContent = nombre ? ("Módulo actual: " + nombre) : "Sin módulo";
  }

  // ---------- Pool de iframes (cache real) ----------
  // pool[moduloId] = { iframe, rutaBase, nombre }
  var pool = {};

  function obtenerHost() {
    var host = document.getElementById("maq-main-frame-host");
    if (!host) {
      console.error("[MAQ_CORE] No se encontró #maq-main-frame-host. Revisa maq-index.html");
    }
    return host;
  }

  function crearIframeParaModulo(moduloId, ruta) {
    var host = obtenerHost();
    if (!host) return null;

    var iframe = document.createElement("iframe");
    iframe.className = "maq-frame maq-frame-hidden";
    iframe.setAttribute("title", "Módulo: " + moduloId);
    iframe.setAttribute("loading", "lazy");
    iframe.src = ruta || "about:blank";

    host.appendChild(iframe);
    return iframe;
  }

  function ocultarTodosLosIframes() {
    Object.keys(pool).forEach(function (id) {
      var it = pool[id];
      if (it && it.iframe) it.iframe.classList.add("maq-frame-hidden");
    });
  }

  function mostrarIframe(moduloId) {
    var it = pool[moduloId];
    if (!it || !it.iframe) return;
    it.iframe.classList.remove("maq-frame-hidden");
  }

  function guardarMemoriaNavegacion(ultimoId, anteriorId) {
    if (!utils || !utils.guardarLocal || !utils.NAV_KEYS) return;
    utils.guardarLocal(utils.NAV_KEYS.ultimoModuloId, ultimoId || null);
    utils.guardarLocal(utils.NAV_KEYS.anteriorModuloId, anteriorId || null);

    utils.guardarNavState({
      ultimoModuloId: ultimoId || null,
      anteriorModuloId: anteriorId || null,
      actualizadoEn: new Date().toISOString()
    });
  }

  function construirUrlConCacheBuster(rutaBase) {
    var base = String(rutaBase || "");
    if (!base) return base;

    var sep = base.indexOf("?") >= 0 ? "&" : "?";
    return base + sep + "_maq_refresh=" + Date.now();
  }

  function refrescarModuloActivo() {
    var moduloId = state.moduloActivoId;
    if (!moduloId) {
      console.warn("[MAQ_CORE] No hay módulo activo para refrescar.");
      return;
    }

    var item = pool[moduloId];
    if (!item || !item.iframe) {
      console.warn("[MAQ_CORE] No existe iframe en pool para refrescar:", moduloId);
      return;
    }

    var rutaBase = item.rutaBase || item.iframe.src || "";
    if (!rutaBase || rutaBase === "about:blank") {
      console.warn("[MAQ_CORE] El módulo no tiene ruta válida para refrescar:", moduloId);
      return;
    }

    item.iframe.src = construirUrlConCacheBuster(rutaBase);

    emit("modulo:refrescado", {
      moduloId: moduloId,
      rutaBase: rutaBase,
      actualizadoEn: new Date().toISOString()
    });
  }

  function enlazarBotonRefrescar() {
    var btn = document.getElementById("maq-btn-refresh");
    if (!btn) return;

    btn.addEventListener("click", function () {
      refrescarModuloActivo();
    });
  }

  var registry = window.MAQ_MODULOS_REGISTRY;

  function navegarPorModuloId(moduloId) {
    var modulo = registry && registry.buscarPorId ? registry.buscarPorId(moduloId) : null;
    if (!modulo) {
      console.error("[MAQ_CORE] No se encontró módulo con id:", moduloId);
      return;
    }

    if (state.moduloActivoId === moduloId) {
      actualizarEtiquetaModulo(modulo.nombre);
      return;
    }

    state.moduloAnteriorId = state.moduloActivoId;
    state.moduloActivoId = moduloId;

    guardarMemoriaNavegacion(state.moduloActivoId, state.moduloAnteriorId);

    if (!pool[moduloId]) {
      var iframe = crearIframeParaModulo(moduloId, modulo.ruta);
      pool[moduloId] = {
        iframe: iframe,
        rutaBase: modulo.ruta,
        nombre: modulo.nombre
      };
    } else {
      var item = pool[moduloId];
      if (item && item.iframe && item.rutaBase !== modulo.ruta) {
        item.rutaBase = modulo.ruta;
        item.iframe.src = modulo.ruta || "about:blank";
      }
    }

    ocultarTodosLosIframes();
    mostrarIframe(moduloId);

    actualizarEtiquetaModulo(modulo.nombre);

    emit("modulo:cambiado", {
      moduloId: moduloId,
      modulo: modulo,
      anteriorModuloId: state.moduloAnteriorId
    });
  }

  function iniciar() {
    if (!window.MAQ_MENU) {
      console.error("[MAQ_CORE] No se encontró MAQ_MENU. Revisa el orden de scripts.");
      return;
    }

    enlazarBotonRefrescar();
    window.MAQ_MENU.inicializarMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  window.MAQ_CORE = {
    state: state,
    bus: { on: on, emit: emit },
    router: { navegarPorModuloId: navegarPorModuloId },
    actions: { refrescarModuloActivo: refrescarModuloActivo }
  };
})(window, document);
