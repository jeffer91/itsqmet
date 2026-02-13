// =========================================================
// ARCHIVO: ficha-search-logic.js
// Lógica de búsqueda para Ficha (RANKING POR RELEVANCIA)
// - Normaliza texto (sin tildes)
// - Calcula score de relevancia por estudiante
// - Ordena por score y devuelve top N
// - Cachea targets normalizados en el objeto para rendimiento
// =========================================================

(function (window) {
  "use strict";

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[FichaSearchLogic]");
    console.log.apply(console, args);
  }

  // Normaliza texto, sin tildes y en minúsculas
  function normalize(text) {
    if (!text) return "";
    return text
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function cleanQuery(rawText) {
    return normalize(rawText || "");
  }

  function buildSearchTarget(student) {
    if (!student) return "";

    // Cache para rendimiento
    if (student.__searchTarget) return student.__searchTarget;

    var parts = [];

    if (student.numeroIdentificacion) parts.push(student.numeroIdentificacion);
    if (student.Nombres) parts.push(student.Nombres);
    if (student.NombreCarrera) parts.push(student.NombreCarrera);
    if (student.CodigoCarrera) parts.push(student.CodigoCarrera);
    if (student.HorarioComplexivo) parts.push(student.HorarioComplexivo);

    var combined = parts.join(" ");
    var target = normalize(combined);

    student.__searchTarget = target;
    return target;
  }

  function ensureNameTokens(student) {
    if (!student) return [];

    if (student.__nameTokens) return student.__nameTokens;

    var n = normalize(student.Nombres || "");
    var tokens = n ? n.split(/\s+/).filter(Boolean) : [];
    student.__nameTokens = tokens;
    student.__nameNorm = n;
    student.__cedNorm = normalize(student.numeroIdentificacion || "");
    student.__careerNorm = normalize(student.NombreCarrera || "");
    student.__codeNorm = normalize(student.CodigoCarrera || "");
    student.__horNorm = normalize(student.HorarioComplexivo || "");
    return tokens;
  }

  function scoreStudent(student, q) {
    if (!student || !q) return 0;

    // Asegura caches
    ensureNameTokens(student);

    var score = 0;

    var ced = student.__cedNorm || "";
    var name = student.__nameNorm || "";
    var career = student.__careerNorm || "";
    var code = student.__codeNorm || "";
    var hor = student.__horNorm || "";

    var qLen = q.length;

    // 1) Cédula: prioridad máxima
    if (ced) {
      if (ced.indexOf(q) === 0) score += 1000;
      else if (ced.indexOf(q) !== -1) score += 600;
    }

    // 2) Nombre: tokens por prefijo (lo más natural)
    var tokens = student.__nameTokens || [];
    if (tokens.length) {
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].indexOf(q) === 0) {
          score += (qLen >= 4 ? 850 : 800);
          break;
        }
      }
    }

    // 3) Nombre contiene
    if (name && name.indexOf(q) !== -1) score += 500;

    // 4) Carrera / código / horario (peso menor)
    if (career && career.indexOf(q) !== -1) score += 220;
    if (code && code.indexOf(q) !== -1) score += 160;
    if (hor && hor.indexOf(q) !== -1) score += 90;

    // 5) Target general (fallback)
    // (Por si algún campo no está contemplado arriba)
    var target = buildSearchTarget(student);
    if (target && target.indexOf(q) !== -1) score += 40;

    return score;
  }

  /**
   * filtrar (ranked)
   *  - lista: arreglo de estudiantes
   *  - queryText: texto ingresado
   *  - maxResults: límite de resultados
   */
  function filtrar(lista, queryText, maxResults) {
    var q = cleanQuery(queryText);
    var max = typeof maxResults === "number" ? maxResults : 5;

    if (!q) return [];

    if (!Array.isArray(lista) || lista.length === 0) {
      log("No hay estudiantes cargados para filtrar");
      return [];
    }

    // Recolectar coincidencias con score
    var scored = [];
    for (var i = 0; i < lista.length; i++) {
      var s = lista[i];
      var sc = scoreStudent(s, q);
      if (sc > 0) {
        scored.push({ s: s, score: sc });
      }
    }

    // Ordenar por score desc; empates: nombre asc; cédula asc
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;

      var an = (a.s.Nombres || "").toString();
      var bn = (b.s.Nombres || "").toString();
      if (an < bn) return -1;
      if (an > bn) return 1;

      var ac = (a.s.numeroIdentificacion || "").toString();
      var bc = (b.s.numeroIdentificacion || "").toString();
      if (ac < bc) return -1;
      if (ac > bc) return 1;

      return 0;
    });

    var out = [];
    for (var j = 0; j < scored.length && out.length < max; j++) {
      out.push(scored[j].s);
    }

    log("Búsqueda:", q, "→", out.length, "coincidencias (ranked)");
    return out;
  }

  window.FichaSearchLogic = {
    filtrar: filtrar,
    cleanQuery: cleanQuery,
    buildSearchTarget: buildSearchTarget
  };
})(window);
