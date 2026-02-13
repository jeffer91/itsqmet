/* =========================================================
Archivo: defart.table.js
Ruta - Ubicación: /defart/defart.table.js
Función o funciones:
- Renderizar tabla DefArt con inputs Notart/Notdef y Notafinal calculado
- Aplicar bloqueo por requisitos (inputs disabled, sin guardar)
- Normalizar nota al escribir (coma/punto, escala 10/100)
- Calcular Notafinal (70/30) en vivo
- Exponer API: render, getVisibleRowIds, getRowPayload, applyImportedRows
========================================================= */
(function (window, document) {
  "use strict";

  var U = window.DefArtUtils;
  var Rules = window.DefArtRules;

  function $(id) { return document.getElementById(id); }

  var state = {
    rows: [],          // lista de estudiantes filtrados para render
    rowIndexById: {},  // id -> idx en rows
    lastRenderedIds: [],
    onRowSave: null,   // callback (id) para guardar por fila
    onDirtyChange: null // callback (id, dirty) para marcar cambios
  };

  // ======== Helpers visuales ========
  function statusBadgeHtml(st) {
    if (!st) return "";

    // ✅ NUEVO: Soporte visual para estado "SIN" (Sin notas)
    // Qué se corrige: se agrega badge para st.code === "SIN".
    // Por qué: sin esto, el estado nuevo se vería como "Regular" por defecto.
    // Qué problema evita: estudiantes sin notas apareciendo como REG en la tabla.
    if (st.code === "SIN") {
      // Estilo inline intencional (cambio mínimo): evita tocar CSS en este ciclo.
      return '<span class="badge" style="background:#e0f2fe;color:#075985;border-color:#bae6fd;">Sin notas</span>';
    }

    if (st.code === "BLOQ") return '<span class="badge badge-red">Bloqueado</span>';
    if (st.code === "SUPL") return '<span class="badge badge-amber">Supletorio</span>';
    return '<span class="badge badge-green">Regular</span>';
  }


  function missingReqTitle(st) {
    if (!st || !st.missingReq || !st.missingReq.length) return "";
    return "Faltan requisitos: " + st.missingReq.join(" | ");
  }

  function fmtCellText(v) {
    return U.escapeHtml(U.safeText(v));
  }

  function noteToInputValue(n10) {
    // UI: coma, máximo 2 decimales
    return U.toComma2(n10);
  }

  function readInputSmart(el) {
    var raw = U.safeText(el.value);
    var res = Rules.normalizeNote(raw);
    if (!res.ok) return { ok: false, value10: null };
    return { ok: true, value10: res.value10 };
  }

  function setInputValidity(el, ok) {
    if (!el) return;
    el.classList.toggle("is-bad", ok === false);
  }

  function setRowDirty(id, dirty) {
    var tr = document.querySelector('tr[data-id="' + CSS.escape(id) + '"]');
    if (!tr) return;
    tr.classList.toggle("row-dirty", !!dirty);
    if (typeof state.onDirtyChange === "function") state.onDirtyChange(id, !!dirty);
  }

  function getRowElsById(id) {
    var tr = document.querySelector('tr[data-id="' + CSS.escape(id) + '"]');
    if (!tr) return null;
    return {
      tr: tr,
      art: tr.querySelector('input[data-k="Notart"]'),
      def: tr.querySelector('input[data-k="Notdef"]'),
      fin: tr.querySelector('[data-k="Notafinal"]'),
      stCell: tr.querySelector('[data-k="estado"]'),
      saveBtn: tr.querySelector('button[data-action="saveRow"]')
    };
  }

  function recalcRowUI(id) {
    var s = window.DefArtData.getById(id);
    if (!s) return;

    var st = Rules.computeState(s);
    var els = getRowElsById(id);
    if (!els) return;

    // actualizar final y estado (final siempre viene de reglas si art+def)
    if (els.fin) els.fin.textContent = noteToInputValue(st.notafinal10);

    if (els.stCell) {
      els.stCell.innerHTML = statusBadgeHtml(st);
      els.stCell.title = missingReqTitle(st);
    }

    // si bloqueado, deshabilitar inputs/botón
    var blocked = st.blocked;
    if (els.art) els.art.disabled = blocked;
    if (els.def) els.def.disabled = blocked;
    if (els.saveBtn) els.saveBtn.disabled = blocked;
    if (els.tr) els.tr.classList.toggle("row-blocked", blocked);
  }

  // ======== Eventos ========
  function onInputChange(ev) {
    var el = ev.target;
    if (!el || el.tagName !== "INPUT") return;
    var id = el.getAttribute("data-id");
    var key = el.getAttribute("data-k");
    if (!id || (key !== "Notart" && key !== "Notdef")) return;

    // Si el estudiante está bloqueado, no debería poder cambiar
    var s = window.DefArtData.getById(id);
    if (!s) return;
    var st = Rules.computeState(s);
    if (st.blocked) {
      el.value = "";
      return;
    }

    // Normalizar al vuelo: si parsea, guardamos en cache como número
    var r = readInputSmart(el);
    setInputValidity(el, r.ok);
    if (!r.ok) return;

    // Persistir solo en cache local (aún no guardar en BD)
    var patch = {};
    patch[key] = (r.value10 === null ? null : r.value10);

    // Si usuario borró la nota, dejamos null
    window.DefArtData.patchCache(id, patch);

    // recalcular final si ya hay las dos notas
    var s2 = window.DefArtData.getById(id);
    var st2 = Rules.computeState(s2);

    // reflejar final calculado en UI y también actualizar cache Notafinal
    window.DefArtData.patchCache(id, { Notafinal: st2.notafinal10 });

    // refrescar UI de estado/final
    recalcRowUI(id);

    // marcar como dirty
    setRowDirty(id, true);
  }

  function onSaveRowClick(ev) {
    var btn = ev.target.closest('button[data-action="saveRow"]');
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    if (!id) return;
    if (typeof state.onRowSave === "function") state.onRowSave(id);
  }

  // ======== Render ========
  function render(tbodyEl, list) {
    var tbody = tbodyEl || $("defart-tbody");
    if (!tbody) return;

    state.rows = list || [];
    state.rowIndexById = {};
    state.lastRenderedIds = [];

    if (!state.rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty">No hay estudiantes con esos filtros.</td></tr>';
      return;
    }

    var html = [];
    for (var i = 0; i < state.rows.length; i++) {
      var s = state.rows[i];
      var id = U.safeText(s.id || s.numeroIdentificacion || "").trim();
      if (!id) continue;

      state.rowIndexById[id] = i;
      state.lastRenderedIds.push(id);

      var st = Rules.computeState(s);
      var blocked = st.blocked;

      var artVal = noteToInputValue(st.notart10);
      var defVal = noteToInputValue(st.notdef10);
      var finVal = noteToInputValue(st.notafinal10);

      var rowTitle = missingReqTitle(st);

      html.push(
        '<tr data-id="' + fmtCellText(id) + '" class="' + (blocked ? "row-blocked" : "") + '">' +
          '<td class="col-idx">' + (i + 1) + '</td>' +
          '<td class="col-ced mono">' + fmtCellText(id) + '</td>' +
          '<td>' + fmtCellText(s.Nombres || "") + '</td>' +
          '<td class="muted">' + fmtCellText(s.NombreCarrera || "") + '</td>' +

          '<td class="col-num">' +
            '<input class="cell-input ' + (blocked ? "is-disabled" : "") + '" ' +
              'inputmode="decimal" placeholder="—" ' +
              'data-id="' + fmtCellText(id) + '" data-k="Notart" value="' + fmtCellText(artVal) + '" ' +
              (blocked ? "disabled" : "") + ' />' +
          '</td>' +

          '<td class="col-num">' +
            '<input class="cell-input ' + (blocked ? "is-disabled" : "") + '" ' +
              'inputmode="decimal" placeholder="—" ' +
              'data-id="' + fmtCellText(id) + '" data-k="Notdef" value="' + fmtCellText(defVal) + '" ' +
              (blocked ? "disabled" : "") + ' />' +
          '</td>' +

          '<td class="col-num col-final"><span class="final" data-k="Notafinal">' + fmtCellText(finVal) + '</span></td>' +

          '<td class="col-estado" data-k="estado" title="' + fmtCellText(rowTitle) + '">' +
            statusBadgeHtml(st) +
          '</td>' +

          '<td class="col-save">' +
            '<button class="btn btn-ghost btn-mini" type="button" data-action="saveRow" data-id="' + fmtCellText(id) + '" ' +
              (blocked ? "disabled" : "") + ' title="Guardar solo esta fila">' +
              '💾' +
            '</button>' +
          '</td>' +
        '</tr>'
      );
    }

    tbody.innerHTML = html.join("");

    // Bind eventos una sola vez por render (delegación)
    tbody.oninput = onInputChange;
    tbody.onclick = onSaveRowClick;
  }

  // ======== API: filas visibles y payload ========
  function getVisibleRowIds() {
    return state.lastRenderedIds.slice();
  }

  function getRowPayload(id) {
    // payload final: solo 3 campos numéricos, max 2 decimales
    var s = window.DefArtData.getById(id);
    if (!s) return null;

    var st = Rules.computeState(s);
    if (st.blocked) return { blocked: true, id: id, payload: null, reason: "BLOQ" };

    // Guardar como número
    var art = (st.notart10 === null ? null : Number(st.notart10));
    var def = (st.notdef10 === null ? null : Number(st.notdef10));
    var fin = (st.notafinal10 === null ? null : Number(st.notafinal10));

    // si el usuario llenó final por importación FINAL, igual art/def están, fin se recalcula
    // pero igual persistimos los tres.
    var payload = {
      Notart: (art === null ? null : U.round2(art)),
      Notdef: (def === null ? null : U.round2(def)),
      Notafinal: (fin === null ? null : U.round2(fin))
    };

    return { blocked: false, id: id, payload: payload };
  }

  // ======== API: aplicar importación (sin guardar) ========
  // rows: [{id, notart?, notdef?, notafinal?, mode:'ART|DEF|FINAL'}]
  function applyImportedRows(rows) {
    rows = rows || [];
    var applied = 0;
    var skipped = 0;
    var blocked = 0;

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var id = U.safeText(r.id).trim();
      if (!id) { skipped++; continue; }

      var s = window.DefArtData.getById(id);
      if (!s) { skipped++; continue; }

      var st = Rules.computeState(s);
      if (st.blocked) { blocked++; continue; }

      // aplicar según mode
      var patch = {};
      if (r.mode === "ART") patch.Notart = (r.notart10 === null ? null : U.round2(r.notart10));
      if (r.mode === "DEF") patch.Notdef = (r.notdef10 === null ? null : U.round2(r.notdef10));

      if (r.mode === "FINAL") {
        // regla tuya: misma nota en los dos
        patch.Notart = (r.notafinal10 === null ? null : U.round2(r.notafinal10));
        patch.Notdef = (r.notafinal10 === null ? null : U.round2(r.notafinal10));
      }

      window.DefArtData.patchCache(id, patch);

      // recalcular final y guardar en cache
      var s2 = window.DefArtData.getById(id);
      var st2 = Rules.computeState(s2);
      window.DefArtData.patchCache(id, { Notafinal: st2.notafinal10 });

      // refrescar esa fila si está en pantalla
      recalcRowUI(id);
      setRowDirty(id, true);

      applied++;
    }

    return { applied: applied, skipped: skipped, blocked: blocked };
  }

  // ======== Exposición ========
  window.DefArtTable = {
    render: render,
    recalcRowUI: recalcRowUI,
    getVisibleRowIds: getVisibleRowIds,
    getRowPayload: getRowPayload,
    applyImportedRows: applyImportedRows,
    setOnRowSave: function (fn) { state.onRowSave = fn; },
    setOnDirtyChange: function (fn) { state.onDirtyChange = fn; }
  };
})(window, document);
