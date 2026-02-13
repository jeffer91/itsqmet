// =========================================================
// ARCHIVO: ficha-tipo-logic.js
// Lógica para el tipo de titulación por estudiante
// - Calcula el tipo por defecto según el periodo
// - Devuelve el tipo inicial considerando lo que ya existe
// =========================================================

(function (window) {
  "use strict";

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[FichaTipoLogic]");
    console.log.apply(console, args);
  }

  // Tipos permitidos
  var TIPOS_VALIDOS = [
    "Examen complexivo",
    "Artículo académico",
    "Trabajo de titulación"
  ];

  // Normaliza diferentes formas de escribir el tipo
  function normalizarTipo(tipo) {
    if (!tipo) return null;
    var t = tipo.toString().trim().toLowerCase();

    // 1. Examen complexivo
    if (t === "examen complexivo" || t === "complexivo") {
      return "Examen complexivo";
    }

    // 2. Artículo académico (Incluye corrección para "Científico")
    if (
      t === "artículo académico" ||
      t === "articulo academico" ||
      t === "articulo académico" ||
      t.indexOf("científico") !== -1 || // <--- Detecta "Científico"
      t.indexOf("cientifico") !== -1    // <--- Detecta "Cientifico"
    ) {
      return "Artículo académico";
    }

    // 3. Trabajo de titulación
    if (t === "trabajo de titulación" || t === "trabajo de titulacion" || t === "trabajo") {
      return "Trabajo de titulación";
    }

    return null;
  }

  // Intenta extraer los meses de un código tipo "2025-04_2025-09"
  function extraerMesesDesdeCodigo(periodoCodigo) {
    if (!periodoCodigo) return { mesInicio: null, mesFin: null };

    var p = periodoCodigo.toString().trim();
    // Formato esperado: AAAA-MM_AAAA-MM
    var m = /^(\d{4})-(\d{2})_(\d{4})-(\d{2})$/.exec(p);
    if (!m) {
      log("PeriodoAsignado no coincide con el formato esperado:", p);
      return { mesInicio: null, mesFin: null };
    }

    return {
      mesInicio: m[2], // MM inicial
      mesFin: m[4]     // MM final
    };
  }

  // Determina si el periodo representa Abril–Septiembre u Octubre–Marzo
  function esPeriodoComplexivo(periodoAsignado, periodoLabel) {
    var meses = extraerMesesDesdeCodigo(periodoAsignado);
    var mesInicio = meses.mesInicio;
    var mesFin = meses.mesFin;

    var label = (periodoLabel || "").toString().toLowerCase();

    // Reglas por código
    var esAbrilSeptPorCodigo = (mesInicio === "04" && mesFin === "09");
    var esOctMarPorCodigo   = (mesInicio === "10" && mesFin === "03");

    // Reglas por texto, por si el código viene raro pero el label está bien
    var esAbrilSeptPorTexto =
      label.includes("abril") && label.includes("septiembre");
    var esOctMarPorTexto =
      label.includes("octubre") && label.includes("marzo");

    return (
      esAbrilSeptPorCodigo ||
      esOctMarPorCodigo ||
      esAbrilSeptPorTexto ||
      esOctMarPorTexto
    );
  }

  // Regla principal: periodo Abril–Septiembre u Octubre–Marzo → Examen complexivo; resto → Artículo académico
  function calcularTipoPorDefecto(student) {
    if (!student) {
      return "Artículo académico";
    }

    var periodoAsignado = student.periodoAsignado || "";
    var periodoLabel = student.periodoLabel || "";

    if (!periodoAsignado && !periodoLabel) {
      log("Estudiante sin periodo, usando Artículo académico por defecto.");
      return "Artículo académico";
    }

    if (esPeriodoComplexivo(periodoAsignado, periodoLabel)) {
      return "Examen complexivo";
    }

    return "Artículo académico";
  }

  // Decide el tipo inicial mostrando si viene de la base o de la regla
  function obtenerTipoInicial(student) {
    if (!student) {
      return {
        tipo: "Artículo académico",
        origen: "defecto",
        tieneGuardado: false
      };
    }

    var tipoGuardado = normalizarTipo(student.TipoTitulacion);

    if (tipoGuardado) {
      return {
        tipo: tipoGuardado,
        origen: "guardado",
        tieneGuardado: true
      };
    }

    var defecto = calcularTipoPorDefecto(student);

    return {
      tipo: defecto,
      origen: "defecto",
      tieneGuardado: false
    };
  }

  // Exponer API pública
  window.FichaTipoLogic = {
    TIPOS_VALIDOS: TIPOS_VALIDOS,
    normalizarTipo: normalizarTipo,
    calcularTipoPorDefecto: calcularTipoPorDefecto,
    obtenerTipoInicial: obtenerTipoInicial
  };
})(window);