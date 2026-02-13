// =========================================================
// Archivo: excel-constants.js
// Ruta: /Gestion/Excel/excel-constants.js
// Función: Constantes del módulo (colecciones, requisitos, headers)
// =========================================================
(function (window) {
  "use strict";

  const EXCEL_CONST = {
    // Colecciones Firestore (nombres centralizados)
    COL: {
      PERIODOS: "periodos",
      ESTUDIANTES: "Estudiantes",
      HISTORIAL: "historial_periodos", // ✅ NUEVA colección de historial global por período
    },

    // Requisitos (keys normalizadas tal como vienen del excel-reader: lower + sin espacios)
    REQUISITOS: [
      "academico",
      "documentacion",
      "financiero",
      "prácticasvinculacion",
      "vinculacion",
      "seguimientograduados",
      "ingles",
      "titulacion",
      "actualizacióndatos",
    ],

    // Headers esperados (normalizados por excel-reader.js)
    EXPECTED_HEADERS: [
      "numeroidentificacion",
      "nombres",
      "codigocarrera",
      "nombrecarrera",
      "horariocomplexivo",
      "academico",
      "documentacion",
      "financiero",
      "titulacion",
      "prácticasvinculacion",
      "vinculacion",
      "seguimientograduados",
      "ingles",
      "actualizacióndatos",
      "correopersonal",
      "correoinstitucional",
      "celular",
    ],

    // Headers críticos mínimos para operar
    CRITICAL_HEADERS: [
      "numeroidentificacion",
      "nombres",
      "codigocarrera",
      "nombrecarrera",
    ],

    // Estado matrícula
    ESTADO: {
      ACTIVO: "ACTIVO",
      RETIRADO: "RETIRADO",
    },

    // Batch chunk (Firestore)
    BATCH_CHUNK: 450,
  };

  window.ExcelConstants = EXCEL_CONST;
})(window);
