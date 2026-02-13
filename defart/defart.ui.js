/* =========================================================
Archivo: defart.ui.js
Ruta - Ubicación: /defart/defart.ui.js
Función o funciones:
- Gestionar filtros (Periodo/Carrera/Estado) + buscador
- Pintar conteos (Total/Regular/Supletorio/Bloqueado)
- Refrescar tabla según filtros
- Mensajes de estado (éxito/error)
========================================================= */
(function (window, document) {
  "use strict";

  var U = window.DefArtUtils;
  var Rules = window.DefArtRules;
  var Data = window.DefArtData;
  var Table = window.DefArtTable;

  function $(id) { return document.getElementById(id); }

  var uiState = {
    periodo: "",
    carrera: "",
    estado: "",
    search: ""
  };

  function setStatus(msg, kind) {
    var el = $("defart-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "status-text " + (kind ? ("status-" + kind) : "");
  }

  function uniqSorted(arr) {
    var map = Object.create(null);
    (arr || []).forEach(function (v) {
      var s = U.safeText(v).trim();
      if (!s) return;
      map[s] = true;
    });
    return Object.keys(map).sort(function (a, b) { return a.localeCompare(b); });
  }

  function fillSelect(selectEl, values, firstLabel) {
    if (!selectEl) return;
    var cur = selectEl.value;
    var opts = [];
    opts.push('<option value="">' + U.escapeHtml(firstLabel || "Todos") + '</option>');
    values.forEach(function (v) {
      opts.push('<option value="' + U.escapeHtml(v) + '">' + U.escapeHtml(v) + '</option>');
    });
    selectEl.innerHTML = opts.join("");
    // mantener selección si existe
    if (cur && values.indexOf(cur) > -1) selectEl.value = cur;
  }

  function ensureEstadoOptions() {
    // ✅ Qué se corrige: agregar filtro "SINDEF" (Sin Notdef) además del existente "SIN" (Sin notas)
    // Por qué: "SIN" es (Notart == null && Notdef == null). Falta listar (Notart != null && Notdef == null).
    // Qué problema evita: no poder filtrar estudiantes con notas incompletas (falta Notdef).
    var fEst = $("defart-filter-estado");
    if (!fEst) return;

    // No duplicar si ya existe en HTML
    if (!fEst.querySelector('option[value="SINDEF"]')) {
      fEst.insertAdjacentHTML("beforeend", '<option value="SINDEF">Sin Notdef</option>');
    }
  }

  function computeCounts(list) {
    // ✅ NUEVO: agregamos "sin" para el estado SIN (Sin notas)
    // Qué se corrige: contar explícitamente estudiantes sin Notart/Notdef.
    // Por qué: antes caían en "reg" por el else, inflando "Regular".
    // Qué problema evita: reportes/estadísticas incorrectas en los pills.
    var counts = { total: 0, reg: 0, supl: 0, bloq: 0, sin: 0 };
    counts.total = list.length;

    for (var i = 0; i < list.length; i++) {
      var st = Rules.computeState(list[i]);
      if (st.code === "BLOQ") counts.bloq++;
      else if (st.code === "SUPL") counts.supl++;
      else if (st.code === "SIN") counts.sin++;
      else counts.reg++;
    }
    return counts;
  }

  function paintCounts(counts) {
    $("defart-pill-total").textContent = "Total: " + counts.total;

    // ✅ CAMBIO MÍNIMO: no tocamos HTML; mostramos "Sin notas" dentro del pill "Regular".
    // Por qué: agrega visibilidad inmediata sin crear nuevos nodos/pills.
    // Nota: "Regular" ahora representa solo REG; "Sin notas" se muestra aparte.
    $("defart-pill-regular").textContent = "Regular: " + counts.reg + " | Sin notas: " + counts.sin;

    $("defart-pill-supl").textContent = "Supletorio: " + counts.supl;
    $("defart-pill-bloq").textContent = "Bloqueado: " + counts.bloq;
  }

  function normalizeSearch(s) {
    return U.safeText(s).trim().toLowerCase();
  }

  function matchSearch(student, q) {
    if (!q) return true;
    var ced = normalizeSearch(student.numeroIdentificacion || student.id || "");
    var nom = normalizeSearch(student.Nombres || "");
    var car = normalizeSearch(student.NombreCarrera || "");
    return (ced.indexOf(q) > -1) || (nom.indexOf(q) > -1) || (car.indexOf(q) > -1);
  }

  function applyFilters(all) {
    var out = [];
    var periodo = U.safeText(uiState.periodo).trim();
    var carrera = U.safeText(uiState.carrera).trim();
    var estado = U.safeText(uiState.estado).trim();
    var q = normalizeSearch(uiState.search);

    for (var i = 0; i < all.length; i++) {
      var s = all[i];

      if (periodo && U.safeText(s.periodoUsado).trim() !== periodo) continue;
      if (carrera && U.safeText(s.NombreCarrera).trim() !== carrera) continue;

      var st = Rules.computeState(s);
      // ✅ Qué se corrige: "SIN" debe incluir cualquiera con una nota faltante (OR),
      // aunque Rules lo marque como SUPL (ej: Notart < 7 y Notdef null).
      // Qué problema evita: que "Sin notas" salga con MENOS filas que "Sin Notdef".
      if (estado === "SIN") {
        if (!(st.blocked === false && (st.notart10 === null || st.notdef10 === null))) continue;
      }
      // ✅ Filtro especial "SINDEF" (tiene Notart pero NO tiene Notdef)
      else if (estado === "SINDEF") {
        if (!(st.blocked === false && st.notart10 !== null && st.notdef10 === null)) continue;
      } else {
        if (estado && st.code !== estado) continue;
      }
      if (!matchSearch(s, q)) continue;

      out.push(s);
    }
    return out;
  }

  function refresh() {
    var all = Data.getAll();
    var filtered = applyFilters(all);
    var counts = computeCounts(filtered);
    paintCounts(counts);

    Table.render($("defart-tbody"), filtered);
    setStatus("Mostrando " + filtered.length + " estudiantes.", "ok");
  }

  // ✅ Mapa idPeriodo -> label humano (desde colección "periodos")
  // Corrige: el select mostraba "2025-08_2026-01" porque solo tomábamos periodoUsado del estudiante.
  // Ahora mostramos el label (ej: "Agosto 2025 a Enero 2026") sin cambiar el value (sigue siendo el id).
  function buildPeriodoLabelMap() {
    var map = Object.create(null);

    // Nota técnica: requiere Firestore ya inicializado (window.DefArtDB) y usa API compat (.collection)
    if (!window.DefArtDB || !window.DefArtDB.collection) {
      // Evita romper UI si Firestore aún no está listo; seguirá mostrando el id.
      console.warn("[DefArtUI] DefArtDB no disponible para leer colección 'periodos'. Se mostrará id de periodo.");
      return Promise.resolve(map);
    }

    return window.DefArtDB.collection("periodos").get()
      .then(function (snap) {
        snap.forEach(function (doc) {
          var d = doc.data() || {};
          var id = U.safeText(doc.id).trim();
          var label = U.safeText(d.label || d.id || doc.id).trim();
          if (id) map[id] = label;
        });
        return map;
      })
      .catch(function (err) {
        console.error("[DefArtUI] Error leyendo colección 'periodos' para labels:", err);
        // No bloqueamos la app: fallback a mostrar id.
        return map;
      });
  }

  // ✅ Calcula carreras disponibles según el periodo seleccionado.
  // Corrige: antes se llenaba Carrera con TODAS las carreras del dataset, sin depender del periodo.
  function computeCarrerasForPeriodo(all, periodoId) {
    var carreras = [];
    for (var i = 0; i < all.length; i++) {
      var s = all[i];
      if (periodoId && U.safeText(s.periodoUsado).trim() !== periodoId) continue;
      carreras.push(U.safeText(s.NombreCarrera).trim());
    }
    return uniqSorted(carreras);
  }

  // ✅ Habilita/Deshabilita el filtro Carrera según si hay periodo elegido.
  function setCarreraEnabled(enabled) {
    var fCar = $("defart-filter-carrera");
    if (!fCar) return;
    fCar.disabled = !enabled;

    // Comentario técnico: si se deshabilita, limpiamos selección para no filtrar con un valor inválido.
    if (!enabled) {
      fCar.value = "";
      uiState.carrera = "";
    }
  }

  // ✅ Rellena Carrera SOLO con carreras del periodo actual.
  function rebuildCarrerasByPeriodo() {
    var all = Data.getAll();
    var periodo = U.safeText(uiState.periodo).trim();
    var fCar = $("defart-filter-carrera");
    if (!fCar) return;

    // Si no hay periodo, deshabilitar y dejar "Todas" vacío
    if (!periodo) {
      fillSelect(fCar, [], "Todas");
      setCarreraEnabled(false);
      return;
    }

    var carreras = computeCarrerasForPeriodo(all, periodo);
    fillSelect(fCar, carreras, "Todas");
    setCarreraEnabled(true);
  }

  function buildFiltersFromData() {
    var all = Data.getAll();
    var periodosIds = uniqSorted(all.map(function (s) { return s.periodoUsado; }));

    // ✅ Carrera inicia deshabilitada hasta escoger Periodo (requisito tuyo)
    var fCar = $("defart-filter-carrera");
    if (fCar) {
      fillSelect(fCar, [], "Todas");
      setCarreraEnabled(false);
    }

    // ✅ Periodos: value = idPeriodo, text = label si existe
    var sel = $("defart-filter-periodo");
    if (!sel) return;

    buildPeriodoLabelMap().then(function (labelMap) {
      var cur = sel.value;
      var opts = [];
      opts.push('<option value="">' + U.escapeHtml("Todos") + '</option>');

      periodosIds.forEach(function (id) {
        var label = labelMap[id] || id; // fallback: si no hay label, mostramos id
        opts.push('<option value="' + U.escapeHtml(id) + '">' + U.escapeHtml(label) + '</option>');
      });

      sel.innerHTML = opts.join("");

      // mantener selección si existe
      if (cur && periodosIds.indexOf(cur) > -1) sel.value = cur;

      // ✅ Si ya había periodo seleccionado al iniciar, reconstruir carreras.
      rebuildCarrerasByPeriodo();
    });
  }

  function bind() {
    var fPer = $("defart-filter-periodo");
    var fCar = $("defart-filter-carrera");
    var fEst = $("defart-filter-estado");
    var search = $("defart-search");

    if (fPer) fPer.addEventListener("change", function () {
      uiState.periodo = fPer.value;

      // ✅ Al cambiar periodo, recalculamos carreras disponibles y habilitamos el filtro Carrera.
      // Evita mostrar carreras que no existen dentro del periodo seleccionado.
      rebuildCarrerasByPeriodo();

      refresh();
    });
    if (fCar) fCar.addEventListener("change", function () { uiState.carrera = fCar.value; refresh(); });
    if (fEst) fEst.addEventListener("change", function () { uiState.estado = fEst.value; refresh(); });

    if (search) search.addEventListener("input", U.debounce(function () {
      uiState.search = search.value;
      refresh();
    }, 220));
  }

  window.DefArtUI = {
    init: function () {
      bind();
      buildFiltersFromData();
      ensureEstadoOptions(); // ✅ agrega "Sin Notdef" al select Estado sin tocar HTML
      refresh();
    },
    refresh: refresh,
    setStatus: setStatus,
    getUIState: function () { return Object.assign({}, uiState); }
  };
})(window, document);
