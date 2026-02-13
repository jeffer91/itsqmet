/* =========================================================
Archivo: defart.utils.js
Ruta - Ubicación: /defart/defart.utils.js
Función o funciones:
- Utilidades generales de DefArt (sin dependencias)
- Normalización de números con coma/punto + escala 10/100
- Formateo a texto con coma (UI)
- debounce, escapeHtml, safeText, descarga TSV/Excel
========================================================= */
(function (window, document) {
  "use strict";

  function safeText(v) {
    return (v === null || v === undefined) ? "" : String(v);
  }

  function escapeHtml(str) {
    return safeText(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

function round2(n) {
  n = Number(n);
  if (!Number.isFinite(n)) return null;

  // ✅ Corrección técnica: evita errores típicos de coma flotante (ej: 1.005 -> 1.00)
  // Por qué: JS usa binario (IEEE-754) y ciertos decimales no se representan exactos,
  // lo que puede hacer que la ponderación 0.7/0.3 "redondee mal" en algunos casos.
  // Qué problema evita: finales como 8.34 cuando matemáticamente esperas 8.35.
  return Math.round((n + Number.EPSILON) * 100) / 100;
}


  // Convierte string mezclado a algo parseable numérico:
  // "7,5" -> "7.5"
  // "1.234,5" -> "1234.5"
  // "1,234.5" -> "1234.5"
  function normalizeDecimalText(raw) {
    var s = safeText(raw).trim();
    if (!s) return "";

    // eliminar espacios internos
    s = s.replace(/\s+/g, "");

    var lastComma = s.lastIndexOf(",");
    var lastDot = s.lastIndexOf(".");

    // Si tiene ambos, decidir cuál es decimal por el último separador
    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) {
        // decimal coma
        s = s.replace(/\./g, "");
        s = s.replace(/,/g, ".");
      } else {
        // decimal punto
        s = s.replace(/,/g, "");
      }
    } else {
      // solo coma: decimal coma
      if (lastComma > -1) s = s.replace(/,/g, ".");
    }
    return s;
  }

  // parsea nota mezclada (0-10 o 0-100) a número 0..10 con max 2 decimales
  function parseSmartNote(raw) {
    var s = normalizeDecimalText(raw);
    if (!s) return { ok: true, value10: null, source: "empty" };

    // permitir solo números y punto
    if (!/^[-+]?\d+(\.\d+)?$/.test(s)) {
      return { ok: false, value10: null, source: "nan", msg: "Nota inválida" };
    }

    var n = Number(s);
    if (!Number.isFinite(n)) {
      return { ok: false, value10: null, source: "nan", msg: "Nota inválida" };
    }

    var value10 = n;
    var source = "scale10";

    // Regla: si > 10, asumimos escala 100
    if (n > 10) {
      value10 = n / 10;
      source = "scale100";
    }

    value10 = clamp(value10, 0, 10);
    value10 = round2(value10);
    return { ok: true, value10: value10, source: source };
  }

  // UI: mostrar con coma, 2 decimales
  function toComma2(n) {
    if (n === null || n === undefined) return "";
    var x = Number(n);
    if (!Number.isFinite(x)) return "";
    return x.toFixed(2).replace(".", ",");
  }

  function debounce(fn, ms) {
    var t = 0;
    return function () {
      var ctx = this;
      var args = arguments;
      window.clearTimeout(t);
      t = window.setTimeout(function () {
        fn.apply(ctx, args);
      }, ms || 250);
    };
  }

function downloadText(filename, text, mimeType) {
  // ✅ Qué se corrige: antes SIEMPRE se descargaba como text/plain, lo que hace que Excel
  // (y Windows) lo trate como "TXT" aunque el nombre sea .csv/.tsv.
  // Por qué: Excel detecta mejor el formato si el MIME coincide (csv/tsv) y si el UTF-8
  // tiene BOM cuando hay acentos.
  // Qué problema evita: que Excel abra "mal" (acentos dañados / lo vea como texto genérico).

  var name = safeText(filename).toLowerCase();

  // Autodetección mínima por extensión (sin librerías)
    var type = mimeType || "text/plain;charset=utf-8";
    if (name.endsWith(".csv")) type = "text/csv;charset=utf-8";
    else if (name.endsWith(".tsv")) type = "text/tab-separated-values;charset=utf-8";
    else if (name.endsWith(".json")) type = "application/json;charset=utf-8";

    // BOM UTF-8: ayuda a Excel con tildes/ñ (cambio mínimo, solo para textos)
    var bom = "\uFEFF";

    var blob = new Blob([bom + safeText(text)], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    }

  // Export simple como TSV (Excel lo abre perfecto)
  function rowsToTSV(headers, rows) {
    var out = [];
    out.push((headers || []).join("\t"));
    (rows || []).forEach(function (r) {
      var line = headers.map(function (h) {
        return safeText(r[h] === undefined ? "" : r[h]).replace(/\t/g, " ");
      }).join("\t");
      out.push(line);
    });
    return out.join("\n");
  }

  window.DefArtUtils = {
    safeText: safeText,
    escapeHtml: escapeHtml,
    clamp: clamp,
    round2: round2,
    normalizeDecimalText: normalizeDecimalText,
    parseSmartNote: parseSmartNote,
    toComma2: toComma2,
    debounce: debounce,
    downloadText: downloadText,
    rowsToTSV: rowsToTSV
  };
})(window, document);
