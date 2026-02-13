// =========================================================
// ARCHIVO: excel-logic.js
// FUNCIÓN:
// - Calcula globales por requisitos (campos reales Firestore)
// - Calcula globales por carreras
// - Genera consolidado estadístico completo
// =========================================================

(function (window) {
  "use strict";

  const Logic = {};

  // MAPEO REAL DE REQUISITOS (Firestore)
  const REQUISITOS = [
    "academico",
    "documentacion",
    "financiero",
    "prácticasvinculacion",
    "vinculacion",
    "seguimientograduados",
    "ingles",
    "titulacion",
    "actualizacióndatos"
  ];

  function normalizar(v) {
    return (v || "")
      .toString()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function esCumple(v) {
    return normalizar(v) === "CUMPLE";
  }

  // --------------------------------------------------------
  // CONSOLIDADO GLOBAL
  // --------------------------------------------------------
  Logic.consolidado = function (rows) {
    const totalEstudiantes = rows.length;
    const requisitos = {};
    const carreras = {};

    REQUISITOS.forEach(r => {
      requisitos[r] = { cumple: 0, noCumple: 0, porcentaje: 0 };
    });

    rows.forEach(r => {
      const carrera = r.nombrecarrera || "SIN CARRERA";

      if (!carreras[carrera]) {
        carreras[carrera] = {
          total: 0,
          cumple: 0,
          noCumple: 0,
          porcentaje: 0
        };
      }

      carreras[carrera].total++;

      let cumpleTodo = true;

      REQUISITOS.forEach(req => {
        if (esCumple(r[req])) {
          requisitos[req].cumple++;
        } else {
          requisitos[req].noCumple++;
          cumpleTodo = false;
        }
      });

      if (cumpleTodo) {
        carreras[carrera].cumple++;
      } else {
        carreras[carrera].noCumple++;
      }
    });

    REQUISITOS.forEach(r => {
      const t = requisitos[r].cumple + requisitos[r].noCumple;
      requisitos[r].porcentaje = t
        ? +(requisitos[r].cumple * 100 / t).toFixed(1)
        : 0;
    });

    Object.values(carreras).forEach(c => {
      c.porcentaje = c.total
        ? +(c.cumple * 100 / c.total).toFixed(1)
        : 0;
    });

    return {
      totalEstudiantes,
      requisitos,
      carreras
    };
  };

  Logic.procesar = function (data) {
    return { rows: data.sheets[0].rows || [] };
  };

  window.ExcelLogic = Logic;

})(window);
