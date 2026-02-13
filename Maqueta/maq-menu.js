// Archivo: Maqueta/maq-menu.js
// Ubicación: /REQUISITOS/Maqueta/maq-menu.js
// Función: Dibuja el menú y submenús, conecta con router,
//          y ahora también sincroniza el botón activo cuando el módulo cambia
//          (incluye carga inicial desde localStorage).

(function (window, document) {
  "use strict";

  var configService = window.MAQ_CONFIG_SERVICE;
  var router = null;
  var utils = window.MAQ_UTILS;

  var state = {
    itemsMenu: [],
    moduloInicialId: "carga_excel"
  };

  // Submenu flotante (se crea en BODY)
  var floatingSubmenu = null;
  var floatingOwnerBtn = null;

  function asegurarDependencias() {
    if (!window.MAQ_CORE) {
      console.error("[MAQ_MENU] No se encontró MAQ_CORE. Verifica el orden de los scripts.");
      return false;
    }
    router = window.MAQ_CORE.router;
    if (!router) {
      console.error("[MAQ_MENU] No se encontró el router dentro de MAQ_CORE.");
      return false;
    }
    return true;
  }

  function intentarCargarUltimoModuloComoInicial() {
    try {
      if (!utils || !utils.leerLocal || !utils.NAV_KEYS) return;
      var ultimo = utils.leerLocal(utils.NAV_KEYS.ultimoModuloId);
      if (typeof ultimo === "string" && ultimo.trim()) {
        state.moduloInicialId = ultimo.trim();
      }
    } catch (e) { /* noop */ }
  }

  function crearBotonMenu(item) {
    var btn = document.createElement("button");
    btn.classList.add("maq-menu-item");
    btn.dataset.menuId = item.id;
    btn.textContent = item.etiqueta;
    return btn;
  }

  function cerrarSubmenuFlotante() {
    if (floatingSubmenu && floatingSubmenu.parentNode) {
      floatingSubmenu.parentNode.removeChild(floatingSubmenu);
    }
    floatingSubmenu = null;
    floatingOwnerBtn = null;
  }

  function posicionarSubmenuDebajoDe(btn) {
    if (!floatingSubmenu || !btn) return;
    var r = btn.getBoundingClientRect();
    floatingSubmenu.style.position = "fixed";
    floatingSubmenu.style.left = Math.round(r.left) + "px";
    floatingSubmenu.style.top = Math.round(r.bottom + 10) + "px";
    floatingSubmenu.style.zIndex = "9999";
  }

  function crearSubmenuFlotante(itemGrupo, btnPadre) {
    cerrarSubmenuFlotante();
    if (!itemGrupo || !Array.isArray(itemGrupo.hijos) || !itemGrupo.hijos.length) return;

    var cont = document.createElement("div");
    cont.classList.add("maq-submenu");

    itemGrupo.hijos.forEach(function (subItem) {
      var sub = document.createElement("div");
      sub.classList.add("maq-submenu-item");
      sub.dataset.menuId = subItem.id;
      sub.textContent = subItem.etiqueta;

      sub.addEventListener("click", function (ev) {
        ev.stopPropagation();
        manejarClickMenu(subItem.id);
        cerrarSubmenuFlotante();
      });

      cont.appendChild(sub);
    });

    cont.addEventListener("mouseleave", function () { cerrarSubmenuFlotante(); });

    document.body.appendChild(cont);

    floatingSubmenu = cont;
    floatingOwnerBtn = btnPadre;

    posicionarSubmenuDebajoDe(btnPadre);
  }

  function buscarItemYPadre(menuId) {
    function buscar(items, parentId) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.id === menuId) return { item: it, parentId: parentId };

        if (it.tipo === "grupo" && Array.isArray(it.hijos)) {
          var found = buscar(it.hijos, it.id);
          if (found) return found;
        }
      }
      return null;
    }
    return buscar(state.itemsMenu, null);
  }

  function marcarActivo(menuId) {
    var itemsBtn = document.querySelectorAll(".maq-menu-item");
    itemsBtn.forEach(function (el) {
      var id = el.dataset.menuId;
      if (!id) return;
      if (id === menuId) el.classList.add("maq-active");
      else el.classList.remove("maq-active");
    });
  }

  // Busca el menuId correspondiente a un moduloId (para marcar activo sin depender del click)
  function encontrarMenuIdPorModuloId(moduloId) {
    var target = "menu_" + String(moduloId || "").trim();

    function buscar(items) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.tipo === "modulo" && it.id === target) return it.id;

        if (it.tipo === "grupo" && Array.isArray(it.hijos)) {
          var r = buscar(it.hijos);
          if (r) return r;
        }
      }
      return null;
    }

    return buscar(state.itemsMenu);
  }

  function manejarClickMenu(menuId) {
    var info = buscarItemYPadre(menuId);
    if (!info) {
      console.warn("[MAQ_MENU] No se encontró info para menuId:", menuId);
      return;
    }

    var item = info.item;

    // Grupo no navega (solo despliega)
    if (item.tipo === "grupo") return;

    var moduloId = item.moduloId;
    if (!moduloId) {
      console.warn("[MAQ_MENU] El item no tiene moduloId:", item);
      return;
    }

    router.navegarPorModuloId(moduloId);
    marcarActivo(menuId);
  }

  function construirMenuDom(itemsMenu) {
    var contenedor = document.getElementById("maq-main-menu");
    if (!contenedor) {
      console.error("[MAQ_MENU] No se encontró el contenedor maq-main-menu");
      return;
    }

    contenedor.innerHTML = "";
    state.itemsMenu = itemsMenu || [];

    state.itemsMenu.forEach(function (item) {
      if (item.tipo === "modulo") {
        var btn = crearBotonMenu(item);

        btn.addEventListener("click", function (ev) {
          ev.stopPropagation();
          cerrarSubmenuFlotante();
          manejarClickMenu(item.id);
        });

        contenedor.appendChild(btn);
        return;
      }

      if (item.tipo === "grupo") {
        var btnGrupo = crearBotonMenu(item);
        btnGrupo.classList.add("maq-menu-item-has-sub");

        btnGrupo.addEventListener("mouseenter", function (ev) {
          ev.stopPropagation();
          crearSubmenuFlotante(item, btnGrupo);
        });

        btnGrupo.addEventListener("click", function (ev) {
          ev.stopPropagation();
          crearSubmenuFlotante(item, btnGrupo);
        });

        contenedor.appendChild(btnGrupo);
      }
    });

    document.addEventListener("click", function () { cerrarSubmenuFlotante(); });

    window.addEventListener("scroll", function () {
      if (floatingSubmenu && floatingOwnerBtn) posicionarSubmenuDebajoDe(floatingOwnerBtn);
    }, { passive: true });

    window.addEventListener("resize", function () {
      if (floatingSubmenu && floatingOwnerBtn) posicionarSubmenuDebajoDe(floatingOwnerBtn);
    });
  }

  function enlazarSyncConRouter() {
    // Marca activo cuando el core cambie de módulo (incluye carga inicial / memoria)
    if (!window.MAQ_CORE || !window.MAQ_CORE.bus || !window.MAQ_CORE.bus.on) return;

    window.MAQ_CORE.bus.on("modulo:cambiado", function (payload) {
      var mid = payload && payload.moduloId ? payload.moduloId : null;
      if (!mid) return;
      var menuId = encontrarMenuIdPorModuloId(mid);
      if (menuId) marcarActivo(menuId);
    });
  }

  function seleccionarModuloInicial() {
    router.navegarPorModuloId(state.moduloInicialId);

    // Marcar activo también al inicio
    var menuId = encontrarMenuIdPorModuloId(state.moduloInicialId);
    if (menuId) marcarActivo(menuId);
  }

  function inicializarMenu() {
    if (!asegurarDependencias()) return;

    intentarCargarUltimoModuloComoInicial();

    configService.obtenerConfigEfectiva().then(function (cfg) {
      var itemsMenu = configService.construirItemsMenu(cfg);
      construirMenuDom(itemsMenu);

      enlazarSyncConRouter();
      seleccionarModuloInicial();
    });
  }

  window.MAQ_MENU = {
    inicializarMenu: inicializarMenu
  };
})(window, document);
