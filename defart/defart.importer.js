/* =========================================================
Archivo: defart.importer.js
Ruta - Ubicación: /defart/defart.importer.js
Función o funciones:
- Controlador del modal “Cargar notas”
- Analiza texto pegado (parser)
- Construye filas para aplicar a tabla (sin guardar)
- ✅ Evolución controlada: delega UI a DefArtImporterView (vista separada)
========================================================= */
(function (window, document) {
  "use strict";

  var U = window.DefArtUtils;
  var Rules = window.DefArtRules;
  var Data = window.DefArtData;
  var Table = window.DefArtTable;

  // ✅ Nuevo: capa de vista
  var View = window.DefArtImporterView;

  function $(id) { return document.getElementById(id); }

  var modalState = {
    parsedRows: [],
    errors: [],
    targetMode: "ASK", // ASK | ART | DEF | FINAL
    lastAnalysisSummary: null
  };

  // ========= Parser inteligente (pegado) =========
  function splitLines(text) {
    var t = U.safeText(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    return t.split("\n").filter(function (l) { return l.trim() !== ""; });
  }

  function splitRow(line) {
    if (line.indexOf("\t") > -1) return line.split("\t");
    if (line.indexOf(",") > -1) return line.split(",");
    return line.split(/\s{2,}/g);
  }

  function looksLikeCedula(s) {
    s = U.safeText(s).trim();
    return /^\d{9,13}$/.test(s);
  }

  function normalizeHeader(h) {
    h = U.safeText(h).trim().toLowerCase();
    h = h.normalize ? h.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : h;
    return h;
  }

  function detectColumns(cells) {
    var map = {};
    for (var i = 0; i < cells.length; i++) {
      var h = normalizeHeader(cells[i]);
      if (h.includes("ced") || h.includes("ident") || h.includes("documento")) map[i] = "id";
      else if (h.includes("nombre") || h.includes("estudiante") || h.includes("apellidos")) map[i] = "name";
      else if (h.includes("carrera")) map[i] = "carrera";
      else if (h.includes("notart") || (h.includes("art") && h.includes("nota"))) map[i] = "art";
      else if (h.includes("notdef") || (h.includes("def") && h.includes("nota"))) map[i] = "def";
      else if (h.includes("notaf") || h.includes("final")) map[i] = "final";
      else if (h.includes("nota")) map[i] = "nota";
    }
    return map;
  }

  function isHeaderRow(cells) {
    if (!cells || !cells.length) return false;
    var m = detectColumns(cells);
    return Object.keys(m).length > 0;
  }

  function isSectionTitleLine(cells) {
    if (!cells || !cells.length) return false;
    var joined = cells.map(function (c) { return U.safeText(c).trim(); }).join(" ").trim();
    if (!joined) return false;

    for (var i = 0; i < cells.length; i++) {
      if (looksLikeCedula(cells[i])) return false;
    }

    var noDigits = !/\d/.test(joined);
    var fewCells = cells.length <= 3;
    var isUpper = (joined === joined.toUpperCase());
    return noDigits && fewCells && isUpper && joined.length >= 4;
  }

  function pickBestNoteFromCandidates(candidates) {
    if (!candidates || !candidates.length) return null;
    for (var i = candidates.length - 1; i >= 0; i--) {
      var raw = U.safeText(candidates[i]).trim();
      if (!raw) continue;
      var r = Rules.normalizeNote(raw);
      if (r && r.ok && r.value10 !== null) return raw;
    }
    return null;
  }

  function analyzePasted(text) {
    var lines = splitLines(text);
    var errors = [];
    var out = [];

    if (!lines.length) {
      errors.push("No hay líneas para analizar.");
      return { rows: [], errors: errors, summary: null };
    }

    var headerMap = null;
    var hasHeader = false;
    var currentSectionTitle = "";

    var firstCells = splitRow(lines[0]);
    var firstMap = detectColumns(firstCells);
    if (Object.keys(firstMap).length > 0) {
      headerMap = firstMap;
      hasHeader = true;
    }

    for (var li = 0; li < lines.length; li++) {
      var cells = splitRow(lines[li]).map(function (c) { return U.safeText(c).trim(); });
      if (!cells.length) continue;

      if (isSectionTitleLine(cells)) {
        currentSectionTitle = cells.map(function (c) { return U.safeText(c).trim(); }).join(" ").trim();
        continue;
      }

      if (isHeaderRow(cells)) {
        headerMap = detectColumns(cells);
        hasHeader = Object.keys(headerMap).length > 0;
        continue;
      }

      var id = null, name = "", carrera = "";
      var artRaw = null, defRaw = null, finRaw = null;
      var notaRaw = null;

      if (hasHeader && headerMap) {
        var notaCandidates = [];
        for (var ci = 0; ci < cells.length; ci++) {
          var t = headerMap[ci];
          if (!t) continue;
          if (t === "id") id = cells[ci];
          else if (t === "name") name = cells[ci];
          else if (t === "carrera") carrera = cells[ci];
          else if (t === "art") artRaw = cells[ci];
          else if (t === "def") defRaw = cells[ci];
          else if (t === "final") finRaw = cells[ci];
          else if (t === "nota") notaCandidates.push(cells[ci]);
        }

        if (!notaRaw && notaCandidates.length) {
          notaRaw = pickBestNoteFromCandidates(notaCandidates);
        }

        if (!notaRaw) {
          for (var cj = cells.length - 1; cj >= 0; cj--) {
            var rr = Rules.normalizeNote(cells[cj]);
            if (rr && rr.ok && rr.value10 !== null) { notaRaw = cells[cj]; break; }
          }
        }
      } else {
        for (var ci2 = 0; ci2 < cells.length; ci2++) {
          if (!id && looksLikeCedula(cells[ci2])) id = cells[ci2];
        }
        for (var ck = cells.length - 1; ck >= 0; ck--) {
          var r = Rules.normalizeNote(cells[ck]);
          if (r && r.ok && r.value10 !== null) { notaRaw = cells[ck]; break; }
        }
      }

      id = U.safeText(id).trim();
      if (!looksLikeCedula(id)) {
        errors.push("Línea " + (li + 1) + ": no se detectó cédula válida.");
        continue;
      }

      carrera = U.safeText(carrera).trim();
      if (!carrera && currentSectionTitle) {
        carrera = currentSectionTitle;
      }

      var art = (artRaw !== null ? Rules.normalizeNote(artRaw) : { ok: true, value10: null });
      var def = (defRaw !== null ? Rules.normalizeNote(defRaw) : { ok: true, value10: null });
      var fin = (finRaw !== null ? Rules.normalizeNote(finRaw) : { ok: true, value10: null });
      var nota = (notaRaw !== null ? Rules.normalizeNote(notaRaw) : { ok: true, value10: null });

      var row = {
        id: id,
        name: U.safeText(name).trim(),
        carrera: carrera,
        art10: art.ok ? art.value10 : null,
        def10: def.ok ? def.value10 : null,
        fin10: fin.ok ? fin.value10 : null,
        single10: nota.ok ? nota.value10 : null
      };
      out.push(row);
    }

    var needAsk = 0;
    var withArtDef = 0;
    var withFinal = 0;
    var withSingle = 0;

    out.forEach(function (r) {
      if (r.art10 !== null || r.def10 !== null) withArtDef++;
      else if (r.fin10 !== null) withFinal++;
      else if (r.single10 !== null) { withSingle++; needAsk++; }
    });

    var summary = {
      total: out.length,
      withArtDef: withArtDef,
      withFinal: withFinal,
      withSingle: withSingle,
      needAsk: needAsk
    };

    return { rows: out, errors: errors, summary: summary };
  }

  function decideModeForRow(row) {
    if (row.art10 !== null && row.def10 !== null) return "ARTDEF";
    if (row.fin10 !== null) return "FINAL_DIRECT";

    if (row.single10 !== null) {
      if (modalState.targetMode === "ASK") return "ASK";
      return modalState.targetMode;
    }
    return "SKIP";
  }

  function buildApplyRows(rows) {
    var apply = [];
    var errors = [];
    var askCount = 0;
    var notFound = 0;
    var blocked = 0;

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var id = U.safeText(r.id).trim();
      var s = Data.getById(id);
      if (!s) { notFound++; continue; }

      var st = Rules.computeState(s);
      if (st.blocked) { blocked++; continue; }

      var mode = decideModeForRow(r);
      if (mode === "ASK") { askCount++; continue; }
      if (mode === "SKIP") continue;

      if (mode === "ARTDEF") {
        apply.push({ id: id, mode: "ART", notart10: r.art10 });
        apply.push({ id: id, mode: "DEF", notdef10: r.def10 });
        continue;
      }

      if (mode === "FINAL_DIRECT") {
        apply.push({ id: id, mode: "FINAL", notafinal10: r.fin10 });
        continue;
      }

      if (mode === "ART") apply.push({ id: id, mode: "ART", notart10: r.single10 });
      if (mode === "DEF") apply.push({ id: id, mode: "DEF", notdef10: r.single10 });
      if (mode === "FINAL") apply.push({ id: id, mode: "FINAL", notafinal10: r.single10 });
    }

    if (askCount > 0) {
      errors.push("Hay " + askCount + " filas con una sola nota. Elige destino ART/DEF/FINAL y vuelve a Analizar.");
    }
    if (notFound > 0) errors.push("Cédulas no encontradas en Estudiantes: " + notFound);
    if (blocked > 0) errors.push("Bloqueados por requisitos (omitidos): " + blocked);

    return { apply: apply, errors: errors, stats: { askCount: askCount, notFound: notFound, blocked: blocked } };
  }

  function analyzeNow() {
    modalState.errors = [];
    modalState.parsedRows = [];

    var paste = $("defart-modal-paste");
    var text = paste ? paste.value : "";

    var res = analyzePasted(text);

    modalState.parsedRows = res.rows;
    modalState.errors = res.errors.slice();
    modalState.lastAnalysisSummary = res.summary;

    // ✅ Cambio controlado: UI se pinta en View, no aquí
    if (View && typeof View.renderErrors === "function") View.renderErrors(modalState.errors);
    if (View && typeof View.renderPreview === "function") View.renderPreview(modalState.parsedRows, modalState.lastAnalysisSummary);

    // Habilitar aplicar solo si no requiere ASK
    var applyBtn = $("defart-modal-apply");
    if (applyBtn) {
      var needAsk = (res.summary && res.summary.needAsk > 0 && modalState.targetMode === "ASK");
      applyBtn.disabled = (!modalState.parsedRows.length) || needAsk;
    }
  }

  function applyNow() {
    var build = buildApplyRows(modalState.parsedRows);
    var errs = modalState.errors.concat(build.errors);

    if (View && typeof View.renderErrors === "function") View.renderErrors(errs);

    if (build.apply.length === 0) return;

    // Aplicar a tabla (solo cache + UI)
    var result = Table.applyImportedRows(build.apply);

    // ✅ Cambio controlado: mostramos resultado sin destruir tabla preview
    if (View && typeof View.renderAppliedResult === "function") View.renderAppliedResult(result);

    // refrescar tabla
    if (window.DefArtUI) window.DefArtUI.refresh();
  }

  function onTargetChange(mode) {
    // ✅ Cambio controlado: el estado lógico (targetMode) lo mantiene el controller
    modalState.targetMode = mode || "ASK";

    // Si ya analizó y había “needAsk”, el usuario eligió destino → revalidar Apply (sin re-analizar)
    var applyBtn = $("defart-modal-apply");
    if (applyBtn) {
      var summary = modalState.lastAnalysisSummary;
      var needAsk = (summary && summary.needAsk > 0 && modalState.targetMode === "ASK");
      applyBtn.disabled = (!modalState.parsedRows.length) || needAsk;
    }
  }

  window.DefArtImporter = {
    init: function () {
      // ✅ Cambio controlado: bindings se hacen desde View, pero las acciones las ejecuta Importer
      if (!View || typeof View.bind !== "function") {
        console.error("[DefArtImporter] Falta DefArtImporterView. Asegura cargar defart.importer.view.js antes.");
        return;
      }

      View.bind({
        onAnalyze: analyzeNow,
        onApply: applyNow,
        onTargetChange: onTargetChange
      });

      // targets por defecto
      View.setTarget("ASK");
      modalState.targetMode = "ASK";
    }
  };
})(window, document);
