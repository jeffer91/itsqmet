/* =========================================================
Archivo: stats-utils.js
Función: Utilidades puras. Formateo de texto, fechas y normalización.
========================================================= */

(function (window) {
  "use strict";

  const StatsUtils = {
    // Normaliza texto (quita acentos, raros, mayúsculas)
    normalizeText(str) {
      if (!str) return "";
      return str.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    },

    // Normaliza keys de objetos corruptos
    normalizeKey(str) {
      if (!str) return "";
      let t = this.normalizeText(str);
      return t.toLowerCase().replace(/[^a-z0-9]/g, "");
    },

    // Normaliza nombres de carrera
    normalizeCareer(str) {
      if (!str) return "";
      return this.normalizeText(str).replace(/\s+/g, " ").toUpperCase();
    },

    // Formatear número a porcentaje string "95.5%"
    toPercent(num, total) {
      if (!total) return "0.0%";
      return ((num / total) * 100).toFixed(1) + "%";
    }
  };

  window.StatsUtils = StatsUtils;
})(window);