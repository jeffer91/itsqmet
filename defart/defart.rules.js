/* =========================================================
Archivo: defart.rules.js
Ruta - Ubicación: /defart/defart.rules.js
Función o funciones:
- Reglas de negocio DefArt
- Requisitos bloqueantes (ignora Titulacion)
- Cálculo Notafinal (70/30)
- Estado: REG / SUPL / BLOQ
- Normalización de notas mezcladas (0-10 o 0-100) con max 2 decimales
========================================================= */
(function (window) {
  "use strict";

  var U = window.DefArtUtils;

  function upper(v) { return (v || "").toString().trim().toUpperCase(); }
  function isCumple(v) { return upper(v) === "CUMPLE"; }

  // Lista exacta confirmada por ti (Titulacion se ignora)
  var REQ_FIELDS = [
    { key: "Academico", label: "Académico" },
    { key: "ActualizaciónDatos", label: "Actualización de Datos" },
    { key: "Documentacion", label: "Documentación" },
    { key: "Financiero", label: "Financiero" },
    { key: "Ingles", label: "Inglés" },
    { key: "PrácticasVinculacion", label: "Prácticas" },
    { key: "Vinculacion", label: "Vinculación" },
    { key: "SeguimientoGraduados", label: "Seguimiento a Graduados" }
  ];

  // Detecta faltantes: si no existe campo, está vacío o no dice CUMPLE
  function getMissingRequirements(student) {
    var missing = [];
    var s = student || {};

    for (var i = 0; i < REQ_FIELDS.length; i++) {
      var f = REQ_FIELDS[i];
      var val = s[f.key];

      // Falta campo o es vacío
      if (val === undefined || val === null || String(val).trim() === "") {
        missing.push(f.label + " (sin dato)");
        continue;
      }

      // No cumple
      if (!isCumple(val)) {
        missing.push(f.label + " (NO CUMPLE)");
      }
    }

    return missing;
  }

  function isBlocked(student) {
    return getMissingRequirements(student).length > 0;
  }

  function calcFinal(notart10, notdef10) {
    if (notart10 === null || notdef10 === null) return null;
    var a = Number(notart10), d = Number(notdef10);
    if (!Number.isFinite(a) || !Number.isFinite(d)) return null;
    // 70/30 fijo
    return U.round2((a * 0.70) + (d * 0.30));
  }

  // Normaliza un valor a 0..10 con max 2 decimales (y retorna null si vacío)
  function normalizeNote(raw) {
    var res = U.parseSmartNote(raw);
    if (!res.ok) return { ok: false, value10: null, msg: res.msg || "Nota inválida" };
    return { ok: true, value10: (res.value10 === null ? null : res.value10), source: res.source };
  }

  function isAprobado(n10) {
    if (n10 === null) return null;
    var n = Number(n10);
    if (!Number.isFinite(n)) return null;
    return n >= 7;
  }

  // Estado global del estudiante para UI
  function computeState(student) {
    var s = student || {};

    // 1) Bloqueo por requisitos
    var missing = getMissingRequirements(s);
    if (missing.length) {
      return {
        code: "BLOQ",
        label: "Bloqueado",
        blocked: true,
        missingReq: missing,
        notart10: null,
        notdef10: null,
        notafinal10: null,
        supletorio: false
      };
    }

    // 2) Notas (leer desde los 3 campos nuevos)
    var art = normalizeNote(s.Notart);
    var def = normalizeNote(s.Notdef);

    var notart10 = art.ok ? art.value10 : null;
    var notdef10 = def.ok ? def.value10 : null;

    // 3) Supletorio si cualquiera < 7 (regla: Notart < 7 O Notdef < 7)
    // ✅ Qué se corrige: ahora SUPL debe salir si una de las dos notas existe y es < 7,
    // incluso si la otra está vacía (null).
    // Qué problema evita: que un 6 en ART (o DEF) quede como "SIN" y no aparezca en filtro SUPL.
    var artOk = isAprobado(notart10);
    var defOk = isAprobado(notdef10);
    var suple = (artOk === false) || (defOk === false);

    if (suple) {
      return {
        code: "SUPL",
        label: "Supletorio",
        blocked: false,
        missingReq: [],
        notart10: notart10,
        notdef10: notdef10,
        // Si falta una nota, final queda null; si están las 2, se calcula.
        notafinal10: calcFinal(notart10, notdef10),
        supletorio: true,
        // Solo para UI: errores de parseo si aplica (mantiene el mismo formato que otros estados)
        parseErrors: [].concat(art.ok ? [] : ["Notart inválida"], def.ok ? [] : ["Notdef inválida"])
      };
    }

    // ✅ Estado "SIN" (Sin notas) ahora es OR:
    // Qué se corrige: antes "SIN" solo aplicaba cuando faltaban AMBAS notas (AND).
    // Por qué: ahora quieres que "SIN" incluya casos incompletos (falta ART o falta DEF).
    // Qué problema evita: no poder filtrar rápidamente estudiantes con una nota faltante.
    // Nota: este bloque va DESPUÉS de SUPL para que el <7 tenga prioridad.
    if (notart10 === null || notdef10 === null) {
      return {
        code: "SIN",
        label: "Sin notas",
        blocked: false,
        missingReq: [],
        notart10: notart10,
        notdef10: notdef10,
        notafinal10: null,
        supletorio: false,
        // Solo para UI: errores de parseo si aplica (mantiene el mismo formato que otros estados)
        parseErrors: [].concat(art.ok ? [] : ["Notart inválida"], def.ok ? [] : ["Notdef inválida"])
      };
    }

    // 4) Regular (ambas existen y ninguna < 7)
    var final10 = calcFinal(notart10, notdef10);

    return {
      code: "REG",
      label: "Regular",
      blocked: false,
      missingReq: [],
      notart10: notart10,
      notdef10: notdef10,
      notafinal10: final10,
      supletorio: false,
      // Solo para UI: errores de parseo si aplica
      parseErrors: [].concat(art.ok ? [] : ["Notart inválida"], def.ok ? [] : ["Notdef inválida"])
    };
  }

  window.DefArtRules = {
    REQ_FIELDS: REQ_FIELDS,
    getMissingRequirements: getMissingRequirements,
    isBlocked: isBlocked,
    normalizeNote: normalizeNote,
    calcFinal: calcFinal,
    computeState: computeState
  };
})(window);
