/* =========================================================
Archivo: defart.data.js
Ruta - Ubicación: /defart/defart.data.js
Función o funciones:
- Cargar colección Estudiantes desde Firestore (DefArtDB)
- Normalizar campos base para UI (id, numeroIdentificacion, Nombres, NombreCarrera, periodoUsado)
- Mantener cache en memoria (getAll, getById)
- NOTA: Este módulo NO guarda, solo lee y normaliza
========================================================= */
(function (window) {
  "use strict";

  var U = window.DefArtUtils;

  var db = null;
  var loaded = false;
  var cache = [];

  function ensureDB() {
    if (db) return db;
    db = window.DefArtDB || null;
    if (!db) {
      console.warn("[DefArtData] DefArtDB no está disponible aún. Debes inicializar Firebase/Firestore antes.");
    }
    return db;
  }

  function pick(obj, keys, fallback) {
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== null) {
        return obj[k];
      }
    }
    return fallback;
  }

  // Normaliza el documento Estudiantes sin inventar campos.
  function mapDocToModel(doc) {
    var data = doc.data() || {};
    var model = {};

    model.id = doc.id; // docId = cédula (confirmado por ti)
    model.numeroIdentificacion = pick(data, ["numeroIdentificacion"], "");
    model.Nombres = pick(data, ["Nombres"], "");
    model.NombreCarrera = pick(data, ["NombreCarrera"], "");
    model.CodigoCarrera = pick(data, ["CodigoCarrera"], "");
    model.HorarioComplexivo = pick(data, ["HorarioComplexivo"], "");

    model.periodoId = pick(data, ["periodoId"], "");
    model.ultimoPeriodoId = pick(data, ["ultimoPeriodoId"], "");
    model.periodoUsado = model.periodoId || model.ultimoPeriodoId || "";

    // Requisitos (Titulacion se ignora en reglas, pero igual puede venir en el doc)
    model.Academico = pick(data, ["Academico"], "");
    model["ActualizaciónDatos"] = pick(data, ["ActualizaciónDatos"], "");
    model.Documentacion = pick(data, ["Documentacion"], "");
    model.Financiero = pick(data, ["Financiero"], "");
    model.Ingles = pick(data, ["Ingles"], "");
    model["PrácticasVinculacion"] = pick(data, ["PrácticasVinculacion"], "");
    model.Vinculacion = pick(data, ["Vinculacion"], "");
    model.SeguimientoGraduados = pick(data, ["SeguimientoGraduados"], "");
    model.Titulacion = pick(data, ["Titulacion"], "");

    // Campos DefArt NUEVOS (solo 3, confirmados)
    model.Notart = pick(data, ["Notart"], null);
    model.Notdef = pick(data, ["Notdef"], null);
    model.Notafinal = pick(data, ["Notafinal"], null);

    // Para UI: estado matrícula si existe
    model.estadoMatricula = pick(data, ["estadoMatricula"], "");

    // Devolvemos mezclado: data original + modelo normalizado (modelo pisa claves)
    return Object.assign({}, data, model);
  }

  function loadAll() {
    var dbi = ensureDB();
    if (!dbi) return Promise.reject(new Error("DefArtDB no disponible"));

    return dbi.collection("Estudiantes").get().then(function (snap) {
      cache = [];
      snap.forEach(function (doc) {
        cache.push(mapDocToModel(doc));
      });
      loaded = true;
      return cache.slice();
    });
  }

  function isLoaded() { return loaded; }
  function getAll() { return cache.slice(); }
  function getById(id) {
    id = U.safeText(id).trim();
    for (var i = 0; i < cache.length; i++) {
      if (cache[i] && U.safeText(cache[i].id).trim() === id) return cache[i];
    }
    return null;
  }

  // Permite que otros módulos actualicen el cache local (sin guardar aún)
  function patchCache(id, patch) {
    var s = getById(id);
    if (!s) return;
    Object.keys(patch || {}).forEach(function (k) { s[k] = patch[k]; });
  }

  window.DefArtData = {
    loadAll: loadAll,
    isLoaded: isLoaded,
    getAll: getAll,
    getById: getById,
    patchCache: patchCache
  };
})(window);
