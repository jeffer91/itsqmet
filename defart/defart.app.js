/* =========================================================
Archivo: defart.app.js
Ruta - Ubicación: /defart/defart.app.js
Función o funciones:
- Orquestador principal DefArt
- Cargar datos desde Firestore (DefArtData.loadAll)
- Inicializar UI, tabla, importer
- Conectar eventos: guardar por fila, guardar visible, exportar, importar excel placeholder
========================================================= */
(function (window, document) {
  "use strict";

  var U = window.DefArtUtils;
  var Data = window.DefArtData;
  var UI = window.DefArtUI;
  var Table = window.DefArtTable;
  var Storage = window.DefArtStorage;
  var Importer = window.DefArtImporter;
  var Rules = window.DefArtRules;

  function $(id) { return document.getElementById(id); }

  function wireButtons() {
    // Guardar visible
    var fab = $("defart-fab-save");
    if (fab) fab.addEventListener("click", function () {
      Storage.saveVisible().then(function () {
        UI.refresh();
      });
    });

    // Guardar por fila (callback desde Table)
    Table.setOnRowSave(function (id) {
      Storage.saveOne(id).then(function () {
        UI.refresh();
      });
    });

    // Exportar (CSV para Excel)
    var exportBtn = $("defart-btn-export");
    if (exportBtn) exportBtn.addEventListener("click", function () {
    var ids = Table.getVisibleRowIds();
    var rows = [];
    for (var i = 0; i < ids.length; i++) {
        var s = Data.getById(ids[i]);
        if (!s) continue;

        var st = Rules.computeState(s);
        rows.push({
        cedula: s.id,
        nombre: s.Nombres || "",
        carrera: s.NombreCarrera || "",
        Notart: (st.notart10 === null ? "" : st.notart10),
        Notdef: (st.notdef10 === null ? "" : st.notdef10),
        Notafinal: (st.notafinal10 === null ? "" : st.notafinal10),
        estado: st.label
        });
    }

    var headers = ["cedula", "nombre", "carrera", "Notart", "Notdef", "Notafinal", "estado"];

    function csvEscape(v) {
        var s = (v === null || v === undefined) ? "" : String(v);
        if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
    }

    // ✅ Qué se corrige: Excel (config regional ES) suele esperar CSV con separador ";"
    // Por qué: con coma "," a veces lo abre en UNA sola columna (se ve "super mal").
    // Qué problema evita: columnas pegadas / necesidad de importar manualmente.
    var SEP = ";";

    var csvLines = [];
    csvLines.push(headers.map(csvEscape).join(SEP)); // encabezados
    for (var r = 0; r < rows.length; r++) {
        var row = rows[r] || {};
        csvLines.push(headers.map(function (h) { return csvEscape(row[h]); }).join(SEP));
    }

    var csv = csvLines.join("\r\n");

    // ✅ MIME explícito: si ya aplicaste el cambio de defart.utils.js, esto fuerza CSV.
    // Si NO lo aplicaste, igual descarga, pero te recomiendo aplicar el ajuste de utils.
    U.downloadText("DefArt_export.csv", csv, "text/csv;charset=utf-8");

    UI.setStatus("Exportación lista (CSV para Excel).", "ok");
    });



    // Importar Excel (placeholder)
    var importBtn = $("defart-btn-import");
    if (importBtn) importBtn.addEventListener("click", function () {
      UI.setStatus("Importar Excel: pendiente lector XLSX. Usa 🧠 Cargar notas (pegado) por ahora.", "work");
      // abrir modal y enfocar file input
      var open = $("defart-btn-cargar");
      if (open) open.click();
      var file = $("defart-modal-file");
      if (file) setTimeout(function () { file.click(); }, 120);
    });
  }

  function enhanceStyles() {
    // badges y estados extra en CSS sin tocar modo oscuro
    var style = document.createElement("style");
    style.textContent = `
      .mono{ font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .muted{ color: #64748b; }
      .cell-input{ width:100%; text-align:right; padding:10px 10px; border-radius: 12px; border:1px solid #dbe2ff; font-weight:900; }
      .cell-input.is-bad{ border-color:#fb7185; box-shadow: 0 0 0 4px rgba(244,63,94,.12); }
      .row-blocked td{ background: #fff1f2; }
      .row-dirty td{ background: #fef9c3; }
      .badge{ display:inline-flex; align-items:center; gap:8px; padding:8px 10px; border-radius:999px; font-weight:1000; font-size:12px; border:1px solid transparent; }
      .badge-green{ background:#dcfce7; color:#166534; border-color:#bbf7d0; }
      .badge-amber{ background:#ffedd5; color:#92400e; border-color:#fed7aa; }
      .badge-red{ background:#ffe4e6; color:#9f1239; border-color:#fecdd3; }
      .btn-mini{ padding: 8px 10px; }
      .chip-active{ border-color:#93c5fd !important; box-shadow: 0 0 0 4px rgba(37,99,235,.10) !important; }
      .status-text.status-ok{ color:#166534; }
      .status-text.status-bad{ color:#b91c1c; }
      .status-text.status-work{ color:#1d4ed8; }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    enhanceStyles();

    // Validación base
    if (!window.DefArtDB) {
      var msg = "No se detecta DefArtDB. Debes inicializar Firebase/Firestore antes de cargar DefArt.";
      console.error(msg);
      var s = $("defart-status");
      if (s) s.textContent = msg;
      return;
    }

    // Cargar datos
    UI.setStatus("Cargando Estudiantes…", "work");
    Data.loadAll()
      .then(function () {
        UI.setStatus("Datos cargados. Construyendo UI…", "work");

        // Init UI y modal
        UI.init();
        Importer.init();
        wireButtons();

        UI.setStatus("Listo. Puedes filtrar, cargar notas y guardar.", "ok");
      })
      .catch(function (err) {
        console.error("[DefArtApp] Error cargando datos:", err);
        UI.setStatus("Error cargando datos: " + (err && err.message ? err.message : err), "bad");
      });
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
