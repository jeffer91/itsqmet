// =========================================================
// ARCHIVO: ficha-ui.js
// Maneja la interfaz de la Ficha de estudiante
// - Conecta buscador, resultados y detalle
// - NUEVO: filtro opcional por periodo
// - NUEVO: muestra periodo normalizado (Junio 2025 a Diciembre 2025)
// - Búsqueda por relevancia (sin corte temprano)
// =========================================================

(function (window, document) {
  "use strict";

  var StudentService = window.FichaStudentService;
  var SearchLogic = window.FichaSearchLogic;
  var TipoLogic = window.FichaTipoLogic;
  var TipoRemote = window.FichaTipoRemote;
  var ObservRemote = window.FichaObservRemote;

  var selectedId = null;
  var selectedTipo = null;
  var selectedObservaciones = null;

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[FichaUI]");
    console.log.apply(console, args);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function setSearchStatus(text) {
    var el = $("ficha-search-status");
    if (!el) return;
    el.textContent = text;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return str
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // -------------------------
  // Filtro de periodo (opcional)
  // -------------------------

  function getPeriodoFilterValue() {
    var sel = $("ficha-period-filter");
    if (!sel) return "";
    return (sel.value || "").toString().trim();
  }

  function applyPeriodoFilter(students, periodoCodigo) {
    if (!periodoCodigo) return students;
    if (!Array.isArray(students) || students.length === 0) return [];

    var out = [];
    for (var i = 0; i < students.length; i++) {
      var s = students[i];
      var p = (s.periodoUsado || s.periodoId || s.ultimoPeriodoId || s.periodoAsignado || "").toString();
      if (p === periodoCodigo) out.push(s);
    }
    return out;
  }

  function buildPeriodOptions(lista) {
    var sel = $("ficha-period-filter");
    if (!sel) return;

    // Mantener "Todos" como primera opción
    sel.innerHTML = "";
    var optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "Todos los periodos";
    sel.appendChild(optAll);

    if (!Array.isArray(lista) || lista.length === 0) return;

    // Map unique periodoUsado -> label
    var map = {};
    for (var i = 0; i < lista.length; i++) {
      var s = lista[i];
      var code = (s.periodoUsado || s.periodoId || s.ultimoPeriodoId || s.periodoAsignado || "").toString().trim();
      if (!code) continue;
      if (!map[code]) {
        map[code] = (s.periodoHuman || "").toString().trim();
      }
    }

    // Convertir a array para ordenar (por código asc, simple y estable)
    var codes = Object.keys(map);
    codes.sort();

    for (var j = 0; j < codes.length; j++) {
      var c = codes[j];
      var label = map[c] || c;
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = label ? (label + " (" + c + ")") : c;
      sel.appendChild(opt);
    }
  }

  // -------------------------
  // Render del buscador
  // -------------------------

  function renderSearchResults(lista, queryText) {
    var ul = $("ficha-search-results");
    if (!ul) return;
    ul.innerHTML = "";

    if (!queryText || queryText.trim().length === 0) {
      setSearchStatus("Escribe cédula, nombre o apellido para buscar.");
      return;
    }

    if (!lista || lista.length === 0) {
      setSearchStatus("No se encontraron estudiantes que coincidan con la búsqueda.");
      return;
    }

    setSearchStatus("Mostrando " + lista.length + " coincidencia(s).");

    lista.forEach(function (s) {
      var li = document.createElement("li");
      li.className = "ficha-search-item";

      var cedula = s.numeroIdentificacion || "Sin cédula";
      var nombre = s.Nombres || "Sin nombre";
      var carrera = s.NombreCarrera || "Sin carrera";
      var horario = s.HorarioComplexivo || "";

      var title = document.createElement("div");
      title.className = "ficha-search-item-title";
      title.textContent = cedula + " – " + nombre;

      var sub = document.createElement("div");
      sub.className = "ficha-search-item-sub";
      sub.textContent = carrera + (horario ? " · " + horario : "");

      li.appendChild(title);
      li.appendChild(sub);

      li.dataset.studentId = s.id || "";
      li.addEventListener("click", function () {
        seleccionarEstudiante(li.dataset.studentId);
      });

      ul.appendChild(li);
    });

    marcarSeleccionEnLista();
  }

  function marcarSeleccionEnLista() {
    var ul = $("ficha-search-results");
    if (!ul) return;
    var items = ul.querySelectorAll(".ficha-search-item");
    Array.prototype.forEach.call(items, function (item) {
      var id = item.dataset.studentId;
      if (id && id === selectedId) item.classList.add("ficha-search-item--selected");
      else item.classList.remove("ficha-search-item--selected");
    });
  }

  function onSearchInput() {
    var input = $("ficha-search-input");
    if (!input) return;

    var queryText = input.value || "";
    var students = StudentService.getAll();

    if (!StudentService.isLoaded()) {
      setSearchStatus("Aún se están cargando los estudiantes…");
      return;
    }

    if (queryText.trim().length < 2) {
      setSearchStatus("Escribe al menos dos caracteres para iniciar la búsqueda.");
      $("ficha-search-results").innerHTML = "";
      return;
    }

    // Aplicar filtro de periodo antes de rankear
    var periodoFiltro = getPeriodoFilterValue();
    var base = applyPeriodoFilter(students, periodoFiltro);

    // Ranked (sin corte temprano en el loop)
    var resultados = SearchLogic.filtrar(base, queryText, 5);
    renderSearchResults(resultados, queryText);
  }

  function onPeriodoFilterChange() {
    // Re-ejecuta la búsqueda actual si hay texto
    onSearchInput();
  }

  function onSearchClear() {
    var input = $("ficha-search-input");
    if (!input) return;
    input.value = "";
    $("ficha-search-results").innerHTML = "";
    setSearchStatus("Escribe cédula, nombre o apellido para buscar.");
    selectedId = null;
    renderDetalle(null);
  }

  // -------------------------
  // Render del detalle
  // -------------------------

  function crearPill(label, valor, tipo) {
    var span = document.createElement("span");
    span.className = "ficha-pill " + (tipo || "ficha-pill--info");
    span.innerHTML = "<span class='ficha-pill-label'>" + label + ":</span> " + valor;
    return span;
  }

  function crearPillRequisito(label, valorRaw) {
    var valor = valorRaw || "NO CUMPLE";
    var v = valor.toString().trim().toUpperCase();
    var tipo = v === "CUMPLE" ? "ficha-pill--ok" : "ficha-pill--warn";
    return crearPill(label, v, tipo);
  }

  function renderDetalle(student) {
    var container = $("ficha-detail");
    if (!container) return;

    if (!student) {
      container.innerHTML =
        "<p class='ficha-detail-empty'>Seleccione un estudiante para ver su ficha.</p>";
      selectedTipo = null;
      selectedObservaciones = null;
      return;
    }

    var cedula = student.numeroIdentificacion || "Sin cédula";
    var nombre = student.Nombres || "Sin nombre";
    var carrera = student.NombreCarrera || "Sin carrera";
    var horario = student.HorarioComplexivo || "Sin horario";

    var periodoCodigo = (student.periodoUsado || student.periodoId || student.ultimoPeriodoId || student.periodoAsignado || "").toString();
    var periodoHuman = (student.periodoHuman || "").toString();
    var periodoLabel = student.periodoLabel || "";
    var ultimaSync = student.ultimaSincronizacion || "";

    var celular = student.Celular || "Sin celular";
    var correoInst = student.CorreoInstitucional || "Sin correo institucional";
    var correoPer = student.CorreoPersonal || "Sin correo personal";

    var observ = student.Observaciones || "";

    // Tipo inicial según la lógica de periodos
    var tipoInfo = TipoLogic
      ? TipoLogic.obtenerTipoInicial(student)
      : { tipo: "Artículo académico", origen: "defecto", tieneGuardado: false };

    var tipoActual = student.TipoTitulacion
      ? (TipoLogic.normalizarTipo(student.TipoTitulacion) || student.TipoTitulacion)
      : tipoInfo.tipo;

    selectedTipo = tipoActual;
    selectedObservaciones = observ;

    var html = "";

    // Cabecera
    html += "<div class='ficha-detail-header'>";
    html += "  <div class='ficha-detail-name'>" + nombre + "</div>";
    html += "  <div class='ficha-detail-id'>" + cedula + "</div>";
    html += "  <div class='ficha-detail-career'>" + carrera + " · " + horario + "</div>";
    html += "</div>";

    // Pills de info general
    html += "<div class='ficha-pill-row' id='ficha-pill-row-info'></div>";

    // Sección CONTACTO
    html += "<div class='ficha-detail-section'>";
    html += "  <div class='ficha-detail-section-title'>Contacto</div>";
    html += "  <div class='ficha-detail-text-row'><span class='ficha-detail-text-label'>Celular:</span> " +
            escapeHtml(celular) + "</div>";
    html += "  <div class='ficha-detail-text-row'><span class='ficha-detail-text-label'>Correo institucional:</span> " +
            escapeHtml(correoInst) + "</div>";
    html += "  <div class='ficha-detail-text-row'><span class='ficha-detail-text-label'>Correo personal:</span> " +
            escapeHtml(correoPer) + "</div>";
    html += "</div>";

    // Sección requisitos
    html += "<div class='ficha-detail-section'>";
    html += "  <div class='ficha-detail-section-title'>Requisitos de titulación</div>";
    html += "  <div class='ficha-pill-row' id='ficha-pill-row-req'></div>";
    html += "</div>";

    // Sección tipo de titulación
    html += "<div class='ficha-detail-section'>";
    html += "  <div class='ficha-detail-section-title'>Tipo de titulación</div>";
    html += "  <div class='ficha-detail-text-row'>" +
            "    <span class='ficha-detail-text-label'>Tipo sugerido por reglas:</span> " +
            TipoLogic.calcularTipoPorDefecto(student) +
            "  </div>";
    html += "  <div class='ficha-detail-text-row'>" +
            "    <span class='ficha-detail-text-label'>Tipo guardado en base:</span> " +
            (student.TipoTitulacion ? student.TipoTitulacion : "Sin definir") +
            "  </div>";

    html += "  <div class='ficha-tipo-options'>";

    var opciones = ["Examen complexivo", "Artículo académico", "Trabajo de titulación"];

    opciones.forEach(function (opt, idx) {
      var idRadio = "ficha-tipo-op-" + idx;
      var checked = (tipoActual === opt) ? "checked" : "";
      html += "    <label class='ficha-tipo-option'>";
      html += "      <input type='radio' name='ficha-tipo' id='" + idRadio +
              "' value='" + opt + "' " + checked + " />";
      html += "      <span>" + opt + "</span>";
      html += "    </label>";
    });

    html += "  </div>";
    html += "  <button type='button' class='ficha-btn-primary' id='ficha-btn-guardar-tipo'>Guardar tipo de titulación</button>";
    html += "  <div id='ficha-tipo-msg' class='ficha-tipo-msg ficha-tipo-msg--info'>" +
            "Elige una opción y guarda para actualizar el estudiante." +
            "</div>";
    html += "</div>";

    // Sección OBSERVACIONES
    html += "<div class='ficha-detail-section'>";
    html += "  <div class='ficha-detail-section-title'>Observaciones</div>";
    html += "  <textarea id='ficha-observ-input' class='ficha-observ-textarea' rows='3' " +
            "placeholder='Escribe observaciones sobre este estudiante…'>" +
            escapeHtml(observ) + "</textarea>";
    html += "  <button type='button' class='ficha-btn-primary' id='ficha-btn-guardar-observ'>Guardar observaciones</button>";
    html += "  <div id='ficha-observ-msg' class='ficha-tipo-msg ficha-tipo-msg--info'>" +
            "Puedes registrar comentarios específicos de este estudiante." +
            "</div>";
    html += "</div>";

    // Footer pequeño con sincronización
    html += "<div class='ficha-detail-section'>";
    html += "  <div class='ficha-detail-section-title'>Sincronización</div>";
    html += "  <div class='ficha-detail-text-row'>" +
            "    <span class='ficha-detail-text-label'>Periodo:</span> " +
            (periodoHuman ? escapeHtml(periodoHuman) : (periodoCodigo || "Sin periodo")) +
            (periodoCodigo ? " (" + escapeHtml(periodoCodigo) + ")" : "") +
            (periodoLabel ? " · " + escapeHtml(periodoLabel) : "") +
            "  </div>";
    if (ultimaSync) {
      html += "  <div class='ficha-detail-text-row'>" +
              "    <span class='ficha-detail-text-label'>Última sincronización:</span> " +
              escapeHtml(ultimaSync) +
              "  </div>";
    }
    html += "</div>";

    container.innerHTML = html;

    // Pills info general
    var rowInfo = $("ficha-pill-row-info");
    if (rowInfo) {
      rowInfo.appendChild(crearPill("Periodo", periodoHuman ? periodoHuman : (periodoCodigo || "Sin periodo"), "ficha-pill--info"));
      rowInfo.appendChild(crearPill("Horario", horario, "ficha-pill--info"));
      rowInfo.appendChild(crearPill("Tipo actual", tipoActual, "ficha-pill--info"));
    }

    var rowReq = $("ficha-pill-row-req");
    if (rowReq) {
      rowReq.appendChild(crearPillRequisito("Académico", student.Academico));
      rowReq.appendChild(crearPillRequisito("Documentación", student.Documentacion));
      rowReq.appendChild(crearPillRequisito("Financiero", student.Financiero));
      rowReq.appendChild(crearPillRequisito("Titulación", student.Titulacion));
      rowReq.appendChild(crearPillRequisito("Prácticas", student.Practicas));
      rowReq.appendChild(crearPillRequisito("Vinculación", student.Vinculacion));
      rowReq.appendChild(crearPillRequisito("Seguimiento graduados", student.SeguimientoGraduados));
      rowReq.appendChild(crearPillRequisito("Inglés", student.Ingles));
      rowReq.appendChild(crearPillRequisito("Datos", student.Datos));
    }

    // Eventos para tipo de titulación
    var radios = container.querySelectorAll("input[name='ficha-tipo']");
    Array.prototype.forEach.call(radios, function (r) {
      r.addEventListener("change", function () {
        selectedTipo = r.value;
      });
    });

    var btnGuardarTipo = $("ficha-btn-guardar-tipo");
    if (btnGuardarTipo) btnGuardarTipo.addEventListener("click", onGuardarTipoClick);

    // Eventos para observaciones
    var obsInput = $("ficha-observ-input");
    if (obsInput) {
      obsInput.addEventListener("input", function () {
        selectedObservaciones = obsInput.value;
      });
      selectedObservaciones = obsInput.value;
    }

    var btnGuardarObs = $("ficha-btn-guardar-observ");
    if (btnGuardarObs) btnGuardarObs.addEventListener("click", onGuardarObservClick);
  }

  function seleccionarEstudiante(id) {
    if (!id) return;
    var s = StudentService.getById(id);
    if (!s) {
      log("No se encontró estudiante con id", id);
      return;
    }

    selectedId = id;
    selectedTipo = null;
    selectedObservaciones = null;
    marcarSeleccionEnLista();
    renderDetalle(s);
  }

  // --- Guardar tipo de titulación ---

  function onGuardarTipoClick() {
    if (!selectedId) return;

    var msgEl = $("ficha-tipo-msg");
    var btn = $("ficha-btn-guardar-tipo");

    var student = StudentService.getById(selectedId);
    if (!student) return;

    if (!selectedTipo) selectedTipo = TipoLogic.calcularTipoPorDefecto(student);

    var tipoNormalizado = TipoLogic.normalizarTipo(selectedTipo) || selectedTipo;

    if (btn) btn.disabled = true;
    if (msgEl) {
      msgEl.className = "ficha-tipo-msg ficha-tipo-msg--info";
      msgEl.textContent = "Guardando tipo de titulación…";
    }

    TipoRemote
      .guardarTipoTitulacion(selectedId, tipoNormalizado)
      .then(function () {
        if (msgEl) {
          msgEl.className = "ficha-tipo-msg ficha-tipo-msg--ok";
          msgEl.textContent = "Tipo de titulación guardado correctamente.";
        }

        StudentService.updateTipoEnCache(selectedId, tipoNormalizado);
        renderDetalle(StudentService.getById(selectedId));
        marcarSeleccionEnLista();
      })
      .catch(function (err) {
        console.error("[FichaUI] Error al guardar tipo:", err);
        if (msgEl) {
          msgEl.className = "ficha-tipo-msg ficha-tipo-msg--error";
          msgEl.textContent = "Error al guardar el tipo de titulación: " + err.message;
        }
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  // --- Guardar observaciones ---

  function onGuardarObservClick() {
    if (!selectedId) return;

    var msgEl = $("ficha-observ-msg");
    var btn = $("ficha-btn-guardar-observ");
    var input = $("ficha-observ-input");

    var student = StudentService.getById(selectedId);
    if (!student || !input) return;

    var texto = input.value || "";

    if (btn) btn.disabled = true;
    if (msgEl) {
      msgEl.className = "ficha-tipo-msg ficha-tipo-msg--info";
      msgEl.textContent = "Guardando observaciones…";
    }

    ObservRemote
      .guardarObservaciones(selectedId, texto)
      .then(function () {
        if (msgEl) {
          msgEl.className = "ficha-tipo-msg ficha-tipo-msg--ok";
          msgEl.textContent = "Observaciones guardadas correctamente.";
        }

        StudentService.updateObservacionesEnCache(selectedId, texto);
        renderDetalle(StudentService.getById(selectedId));
        marcarSeleccionEnLista();
      })
      .catch(function (err) {
        console.error("[FichaUI] Error al guardar observaciones:", err);
        if (msgEl) {
          msgEl.className = "ficha-tipo-msg ficha-tipo-msg--error";
          msgEl.textContent = "Error al guardar las observaciones: " + err.message;
        }
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  // --- Inicialización pública ---

  function init() {
    var input = $("ficha-search-input");
    if (input) input.addEventListener("input", onSearchInput);

    var btnClear = $("ficha-search-clear");
    if (btnClear) btnClear.addEventListener("click", onSearchClear);

    var selPeriodo = $("ficha-period-filter");
    if (selPeriodo) selPeriodo.addEventListener("change", onPeriodoFilterChange);

    setSearchStatus("Cargando estudiantes desde la base de datos…");
  }

  function setStudents(lista) {
    // Construir opciones de periodo
    buildPeriodOptions(lista);

    if (!Array.isArray(lista) || lista.length === 0) {
      setSearchStatus("La colección Estudiantes está vacía. No hay datos para mostrar.");
    } else {
      setSearchStatus(
        "Estudiantes cargados correctamente. Escribe para buscar entre " + lista.length + " registros."
      );
    }
  }

  window.FichaUI = {
    init: init,
    setStudents: setStudents,
    seleccionarEstudiante: seleccionarEstudiante
  };
})(window, document);
