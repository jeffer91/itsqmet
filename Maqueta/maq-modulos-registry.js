// Archivo: Maqueta/maq-modulos-registry.js
// Ubicación: /REQUISITOS/Maqueta/maq-modulos-registry.js
// Función: Fuente única de rutas para el router.
//          Corrige las rutas reales según tu estructura (anti.html, defart.html, repo_index.html, etc.).
//          IMPORTANTE: Para estos módulos “principales”, el fallback manda (aunque MAQ_AUTODATA esté mal),
//          así evitamos los "Cannot GET /index.html".

(function (window) {
  "use strict";

  var base = "..";

  // RUTAS REALES según tus carpetas y nombres de archivo
  // (estas deben funcionar con Live Server abriendo Maqueta/maq-index.html)
  var FALLBACK = {
    // Sistema
    carga_excel:      { nombre: "Carga",        ruta: base + "/Gestion/Excel/excel.html" },
    tabla_principal:  { nombre: "Tabla",        ruta: base + "/Gestion/Tabla/tabla.html" },
    ficha_estudiante: { nombre: "Ficha",        ruta: base + "/Ficha/ficha.html" },
    stat_main:        { nombre: "Estadísticas", ruta: base + "/Stats/stats.html" },

    // Reportes (tu archivo real es repo_index.html)
    modulo_reporte:   { nombre: "Reporte",      ruta: base + "/Reportes/repo_index.html" },

    // Plagio (tu archivo real es anti.html)
    anti:             { nombre: "Plagio",       ruta: base + "/anti/anti.html" },

    // Defensa (tu archivo real es defart.html)
    defart:           { nombre: "Defensa",      ruta: base + "/defart/defart.html" },

    // Cronograma (hijos)
    feriados:         { nombre: "Feriados",      ruta: base + "/cronograma/feriados/feriados.html" },
    titulacion:       { nombre: "Titulación",    ruta: base + "/cronograma/titulacion/cronograma.html" },
    configuracion:    { nombre: "Configuración", ruta: base + "/cronograma/configuracion/config.html" }
  };

  // Estos IDs quedan "bloqueados" para usar SIEMPRE la ruta correcta del FALLBACK
  // (aunque MAQ_AUTODATA tenga rutas viejas tipo index.html)
  var LOCKED_IDS = Object.keys(FALLBACK);

  function safeArr(x) { return Array.isArray(x) ? x : []; }
  function normId(x) { return String(x || "").trim(); }
  function normTxt(x) { return String(x || "").trim(); }

  function pushIfValid(list, m) {
    if (!m || !m.id) return;
    if (!m.ruta) return;
    list.push(m);
  }

  function fromAutodata(autodata) {
    var list = [];
    safeArr(autodata).forEach(function (item) {
      if (!item || !item.tipo) return;

      if (item.tipo === "modulo") {
        pushIfValid(list, {
          id: normId(item.id),
          nombre: normTxt(item.etiqueta || item.nombre || item.id),
          ruta: normTxt(item.ruta),
          categoria: "auto",
          habilitado: true
        });
      }

      if (item.tipo === "grupo") {
        safeArr(item.hijos).forEach(function (h) {
          pushIfValid(list, {
            id: normId(h.id),
            nombre: normTxt(h.etiqueta || h.nombre || h.id),
            ruta: normTxt(h.ruta),
            categoria: "auto",
            habilitado: true
          });
        });
      }
    });
    return list;
  }

  function buildLockedBase() {
    var list = [];
    LOCKED_IDS.forEach(function (id) {
      var fb = FALLBACK[id];
      list.push({
        id: id,
        nombre: fb.nombre,
        ruta: fb.ruta,
        categoria: "fallback",
        habilitado: true
      });
    });
    return list;
  }

  function mergeLockedWithAuto(lockedList, autoList) {
    // 1) Ponemos primero los bloqueados (siempre correctos)
    var byId = Object.create(null);
    lockedList.forEach(function (m) { byId[m.id] = m; });

    // 2) Solo agregamos AUTODATA si el id NO está bloqueado
    safeArr(autoList).forEach(function (m) {
      if (!m || !m.id) return;
      if (byId[m.id]) return; // bloqueado: ignorar ruta auto para evitar Cannot GET
      byId[m.id] = m;
    });

    return Object.keys(byId).map(function (id) { return byId[id]; });
  }

  var autoData = window.MAQ_AUTODATA || [];
  var autoModules = fromAutodata(autoData);

  var lockedBase = buildLockedBase();
  var allModules = mergeLockedWithAuto(lockedBase, autoModules);

  function buscarPorId(id) {
    var key = normId(id);
    for (var i = 0; i < allModules.length; i++) {
      if (allModules[i].id === key) return allModules[i];
    }
    return null;
  }

  function listarHabilitados() {
    return allModules.filter(function (m) { return !!m.habilitado; });
  }

  window.MAQ_MODULOS_REGISTRY = {
    lista: allModules,
    buscarPorId: buscarPorId,
    listarHabilitados: listarHabilitados,
    registrarExtras: function () { /* compat */ }
  };
})(window);
