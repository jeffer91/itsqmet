/* =========================================================
Archivo: defart.importer.view.js
Ruta - Ubicación: /defart/defart.importer.view.js
Función o funciones:
- Vista (UI) del modal "Cargar notas (inteligente)"
- Renderizar errores/alertas
- Renderizar vista previa como TABLA real (no <pre>)
- Mantener lógica separada: este archivo NO analiza ni aplica a datos
========================================================= */
(function (window, document) {
  "use strict";

  var U = window.DefArtUtils;

  function $(id) { return document.getElementById(id); }

  // Estado UI simple (solo visual)
  var ui = {
    targetMode: "ASK"
  };

  function showModal(show) {
    var m = $("defart-modal");
    var b = $("defart-modal-backdrop");
    if (!m || !b) return;

    // ✅ Cambio controlado: centralizamos show/hide aquí para que importer.js no mezcle vista
    m.style.display = show ? "block" : "none";
    b.style.display = show ? "block" : "none";
    m.setAttribute("aria-hidden", show ? "false" : "true");
    b.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function setTarget(mode) {
    ui.targetMode = mode || "ASK";

    var wrap = $("defart-modal-target");
    if (!wrap) return;

    var chips = wrap.querySelectorAll(".chip");
    chips.forEach(function (c) {
      c.classList.toggle("chip-active", c.getAttribute("data-target") === ui.targetMode);
    });
  }

  function reset() {
    // ✅ Cambio controlado: al abrir modal limpiamos UI visual de forma consistente
    var t = $("defart-modal-paste");
    var e = $("defart-modal-errors");
    var apply = $("defart-modal-apply");

    if (t) t.value = "";
    if (e) e.textContent = "—";
    if (apply) apply.disabled = true;

    // Limpiar tabla preview
    renderPreview([], null);

    // Reset file name
    var fn = $("defart-modal-file-name");
    if (fn) fn.textContent = "Ningún archivo";

    setTarget("ASK");
  }

  function renderErrors(arr) {
    var e = $("defart-modal-errors");
    if (!e) return;

    if (!arr || !arr.length) {
      e.textContent = "—";
      return;
    }

    e.textContent = arr.map(function (x) { return "• " + x; }).join("\n");
  }

  function pickRowNote(row) {
    // ✅ Cambio controlado: vista decide qué mostrar como "NOTA" sin tocar lógica de negocio
    if (!row) return "";
    if (row.fin10 !== null && row.fin10 !== undefined) return row.fin10;
    if (row.art10 !== null && row.art10 !== undefined) return row.art10;
    if (row.def10 !== null && row.def10 !== undefined) return row.def10;
    if (row.single10 !== null && row.single10 !== undefined) return row.single10;
    return "";
  }

  function renderPreview(rows, summary) {
    var wrap = $("defart-modal-preview");
    if (!wrap) return;

    var tbody = $("defart-preview-tbody");
    var meta = $("defart-preview-meta");

    // ✅ Protección: si por alguna razón no existe el tbody (HTML no actualizado), no revienta.
    if (!tbody) {
      wrap.textContent = "Vista previa no disponible (faltan nodos HTML de preview).";
      return;
    }

    rows = rows || [];

    // Render filas
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var nota = pickRowNote(r);
      out.push(
        "<tr>" +
          '<td class="pv-ced">' + U.escapeHtml(U.safeText(r.id)) + "</td>" +
          '<td class="pv-name">' + U.escapeHtml(U.safeText(r.name || "")) + "</td>" +
          '<td class="pv-note mono">' + U.escapeHtml(nota === "" ? "" : String(nota)) + "</td>" +
        "</tr>"
      );
    }
    tbody.innerHTML = out.length ? out.join("") : (
      '<tr><td colspan="3" class="pv-empty">—</td></tr>'
    );

    // Render resumen
    if (!meta) return;
    if (!summary) {
      meta.textContent = "—";
      return;
    }

    // ✅ Nota: mantenemos el texto corto, la tabla es lo principal
    var bits = [];
    bits.push("Filas: " + summary.total);
    if (summary.withSingle) bits.push("Una sola nota: " + summary.withSingle + (summary.needAsk > 0 ? " (elige destino)" : ""));
    if (summary.withArtDef) bits.push("Con ART/DEF: " + summary.withArtDef);
    if (summary.withFinal) bits.push("Con FINAL: " + summary.withFinal);

    meta.textContent = bits.join(" • ");
  }

  function renderAppliedResult(result) {
    // ✅ Cambio controlado: mostramos resultado en el “meta”, sin reemplazar la tabla por texto
    var meta = $("defart-preview-meta");
    if (!meta) return;

    meta.textContent =
      "Aplicación completada • " +
      "Aplicadas: " + (result && result.applied ? result.applied : 0) + " • " +
      "Omitidas (no encontradas): " + (result && result.skipped ? result.skipped : 0) + " • " +
      "Omitidas (bloqueadas): " + (result && result.blocked ? result.blocked : 0);
  }

  function bind(events) {
    events = events || {};

    var openBtn = $("defart-btn-cargar");
    var closeBtn = $("defart-modal-close");
    var back = $("defart-modal-backdrop");

    function close() {
      showModal(false);
      if (typeof events.onClose === "function") events.onClose();
    }

    if (openBtn) openBtn.addEventListener("click", function () {
      reset();
      showModal(true);

      // ✅ Evita UX rara: foco al textarea
      var t = $("defart-modal-paste");
      if (t) setTimeout(function () { t.focus(); }, 30);

      if (typeof events.onOpen === "function") events.onOpen();
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    if (back) back.addEventListener("click", close);

    // Chips destino
    var wrap = $("defart-modal-target");
    if (wrap) wrap.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".chip");
      if (!btn) return;

      var mode = btn.getAttribute("data-target") || "ASK";
      setTarget(mode);

      // ✅ Importer decide si necesita re-analizar o habilitar Apply
      if (typeof events.onTargetChange === "function") events.onTargetChange(mode);
    });

    // File name
    var file = $("defart-modal-file");
    if (file) file.addEventListener("change", function () {
      var nameEl = $("defart-modal-file-name");
      if (nameEl) nameEl.textContent = file.files && file.files[0] ? file.files[0].name : "Ningún archivo";

      // ✅ Placeholder: dejamos hook para futuro lector XLSX
      if (typeof events.onFileChange === "function") events.onFileChange(file.files && file.files[0] ? file.files[0] : null);
    });

    // Botones
    var analyzeBtn = $("defart-modal-analyze");
    if (analyzeBtn) analyzeBtn.addEventListener("click", function () {
      if (typeof events.onAnalyze === "function") events.onAnalyze();
    });

    var applyBtn = $("defart-modal-apply");
    if (applyBtn) applyBtn.addEventListener("click", function () {
      if (typeof events.onApply === "function") events.onApply();
    });

    // ESC
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        var m = $("defart-modal");
        if (m && m.getAttribute("aria-hidden") === "false") close();
      }
    });
  }

  window.DefArtImporterView = {
    // estado
    getTargetMode: function () { return ui.targetMode; },

    // acciones UI
    showModal: showModal,
    setTarget: setTarget,
    reset: reset,

    // render
    renderErrors: renderErrors,
    renderPreview: renderPreview,
    renderAppliedResult: renderAppliedResult,

    // bind
    bind: bind
  };
})(window, document);
