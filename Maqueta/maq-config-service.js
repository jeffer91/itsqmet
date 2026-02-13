// Archivo: Maqueta/maq-config-service.js
// Ubicación: /REQUISITOS/Maqueta/maq-config-service.js
// Función: Construye el menú (módulos + grupos) 100% desde MAQ_AUTODATA,
//          aplicando un ORDEN FIJO para los 8 accesos principales y el grupo Cronograma.

(function (window) {
  "use strict";

  function safeArr(x) { return Array.isArray(x) ? x : []; }
  function normId(x) { return String(x || "").trim(); }

  // Orden fijo definido por Jeff
  var ORDER = [
    "carga_excel",
    "tabla_principal",
    "ficha_estudiante",
    "stat_main",
    "anti",              // Plagio
    "modulo_reporte",    // Reporte
    "defart",            // Defensa
    "cronograma"         // Grupo
  ];

  function indexById(autodata) {
    var idx = Object.create(null);

    safeArr(autodata).forEach(function (item) {
      if (!item || !item.id) return;

      if (item.tipo === "modulo") {
        idx[item.id] = item;
      } else if (item.tipo === "grupo") {
        idx[item.id] = item;
      }
    });

    return idx;
  }

  function buildMenuItemModulo(moduloId, etiqueta, orden) {
    return {
      id: "menu_" + moduloId,
      tipo: "modulo",
      etiqueta: etiqueta,
      moduloId: moduloId,
      orden: orden
    };
  }

  function buildMenuItemGrupo(grupoId, etiqueta, hijos, orden) {
    var hijosMenu = safeArr(hijos).map(function (h) {
      return {
        id: "menu_" + normId(h.id),
        etiqueta: String(h.etiqueta || h.nombre || h.id || "").trim(),
        moduloId: normId(h.id)
      };
    }).filter(function (h) { return !!h.moduloId; });

    return {
      id: "grp_" + grupoId,
      tipo: "grupo",
      etiqueta: etiqueta,
      hijos: hijosMenu,
      orden: orden
    };
  }

  function obtenerConfigEfectiva() {
    var autoData = window.MAQ_AUTODATA || [];
    var map = indexById(autoData);

    var itemsMenuCalculados = [];
    var baseOrden = 10;

    ORDER.forEach(function (id, i) {
      var orden = baseOrden + (i * 10);

      // Si no está en autodata, igual creamos el botón (pero quedará sin ruta si registry no lo resuelve)
      var item = map[id];

      if (id === "cronograma") {
        // Grupo Cronograma
        var etiquetaGrupo = (item && (item.etiqueta || item.nombre)) ? (item.etiqueta || item.nombre) : "Cronograma";
        var hijos = (item && item.hijos) ? item.hijos : [];

        // Si el grupo no trae hijos, intentamos detectar los 3 esperados por id
        if (!hijos.length) {
          hijos = [
            { id: "feriados", etiqueta: "Feriados" },
            { id: "titulacion", etiqueta: "Titulación" },
            { id: "configuracion", etiqueta: "Configuración" }
          ];
        }

        itemsMenuCalculados.push(buildMenuItemGrupo("cronograma", etiquetaGrupo, hijos, orden));
        return;
      }

      // Módulos principales
      var etiqueta =
        (item && (item.etiqueta || item.nombre)) ? (item.etiqueta || item.nombre) :
        (id === "anti") ? "Plagio" :
        (id === "defart") ? "Defensa" :
        (id === "modulo_reporte") ? "Reporte" :
        (id === "carga_excel") ? "Carga" :
        (id === "tabla_principal") ? "Tabla" :
        (id === "ficha_estudiante") ? "Ficha" :
        (id === "stat_main") ? "Estadísticas" :
        id;

      itemsMenuCalculados.push(buildMenuItemModulo(id, etiqueta, orden));
    });

    // Orden final por campo
    itemsMenuCalculados.sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });

    return Promise.resolve({ itemsMenuCalculados: itemsMenuCalculados });
  }

  function construirItemsMenu(config) {
    return (config && config.itemsMenuCalculados) ? config.itemsMenuCalculados : [];
  }

  window.MAQ_CONFIG_SERVICE = {
    obtenerConfigEfectiva: obtenerConfigEfectiva,
    construirItemsMenu: construirItemsMenu
  };
})(window);
