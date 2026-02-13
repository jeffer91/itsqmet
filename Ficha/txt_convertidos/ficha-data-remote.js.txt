// =========================================================
// ARCHIVO: ficha-data-remote.js
// Acceso remoto a datos para Ficha
// - Lee la colección Estudiantes desde Firestore (window.FichaDB)
// - Normaliza campos para la UI (soporta CamelCase, minúsculas y tildes)
// - Incluye periodoId / ultimoPeriodoId + periodoUsado + periodoHuman
// - Incluye FichaStudentService con cache en memoria
// =========================================================

(function (window) {
  "use strict";

  var db = window.FichaDB || null;

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[FichaDataRemote]");
    console.log.apply(console, args);
  }

  function ensureDB() {
    if (db && typeof db.collection === "function") return db;

    db = window.FichaDB;
    if (!db || typeof db.collection !== "function") {
      console.error("[FichaDataRemote] FichaDB no está disponible");
      return null;
    }
    return db;
  }

  // -------------------------
  // Helpers
  // -------------------------

  function pick(data, keys, fallback) {
    if (!data) return fallback;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        var v = data[k];
        if (v !== undefined && v !== null && v !== "") return v;
      }
    }
    return fallback;
  }

  function pad2(n) {
    var s = (n || "").toString();
    return s.length === 1 ? "0" + s : s;
  }

  function mesNombreES(mm) {
    var m = pad2(mm);
    var map = {
      "01": "Enero",
      "02": "Febrero",
      "03": "Marzo",
      "04": "Abril",
      "05": "Mayo",
      "06": "Junio",
      "07": "Julio",
      "08": "Agosto",
      "09": "Septiembre",
      "10": "Octubre",
      "11": "Noviembre",
      "12": "Diciembre"
    };
    return map[m] || null;
  }

  // "2025-06_2025-12" -> "Junio 2025 a Diciembre 2025"
  function periodoCodigoAHumano(periodoCodigo) {
    if (!periodoCodigo) return "";

    var p = periodoCodigo.toString().trim();
    var m = /^(\d{4})-(\d{2})_(\d{4})-(\d{2})$/.exec(p);
    if (!m) return "";

    var y1 = m[1], mm1 = m[2];
    var y2 = m[3], mm2 = m[4];

    var mes1 = mesNombreES(mm1);
    var mes2 = mesNombreES(mm2);

    if (!mes1 || !mes2) return "";

    return mes1 + " " + y1 + " a " + mes2 + " " + y2;
  }

  // -------------------------
  // Normalización del doc
  // -------------------------

  function mapDocToModel(doc) {
    var data = doc.data() || {};
    var model = {};

    model.id = doc.id;

    // Identificación y básicos (CamelCase y minúsculas)
    model.numeroIdentificacion = pick(data, ["numeroIdentificacion", "numeroidentificacion"], "");
    model.Nombres = pick(data, ["Nombres", "nombres"], "");
    model.NombreCarrera = pick(data, ["NombreCarrera", "nombrecarrera"], "");
    model.CodigoCarrera = pick(data, ["CodigoCarrera", "codigocarrera"], "");
    model.HorarioComplexivo = pick(data, ["HorarioComplexivo", "horariocomplexivo"], "");

    // Contacto
    model.Celular = pick(data, ["Celular", "celular"], "");
    model.CorreoInstitucional = pick(data, ["CorreoInstitucional", "correoinstitucional"], "");
    model.CorreoPersonal = pick(data, ["CorreoPersonal", "correopersonal"], "");

    // Observaciones (por compatibilidad)
    model.Observaciones = pick(data, ["Observaciones", "observaciones"], "");

    // Estado matrícula / retiro (nuevo, por si quieres mostrarlo en UI)
    model.estadoMatricula = pick(data, ["estadoMatricula", "estadomatricula"], "");
    model.retiradoEn = pick(data, ["retiradoEn", "retiradoen"], "");

    // Periodo / Sync (ya vienen CamelCase en tu DB)
    model.periodoId = pick(data, ["periodoId", "periodoid"], "");
    model.ultimoPeriodoId = pick(data, ["ultimoPeriodoId", "ultimoperiodoid"], "");

    model.periodoUsado = model.periodoId || model.ultimoPeriodoId || "";

    // Compat: algunos módulos antiguos usan periodoAsignado
    model.periodoAsignado = model.periodoUsado;

    model.periodoHuman = periodoCodigoAHumano(model.periodoUsado) || "";

    model.periodoLabel = pick(data, ["periodoLabel", "periodolabel"], "");
    model.ultimaSincronizacion = pick(data, ["ultimaSincronizacion", "ultimasincronizacion"], "");

    // Requisitos (tu DB los tiene en CamelCase)
    model.Academico = pick(data, ["Academico", "academico"], "");
    model.Documentacion = pick(data, ["Documentacion", "documentacion"], "");
    model.Financiero = pick(data, ["Financiero", "financiero"], "");
    model.Titulacion = pick(data, ["Titulacion", "titulacion"], "");
    model.Vinculacion = pick(data, ["Vinculacion", "vinculacion"], "");
    model.SeguimientoGraduados = pick(data, ["SeguimientoGraduados", "seguimientograduados"], "");
    model.Ingles = pick(data, ["Ingles", "ingles"], "");

    // Prácticas (tu DB: "PrácticasVinculacion")
    model.Practicas = pick(
      data,
      [
        "PrácticasVinculacion",
        "PracticasVinculacion",
        "prácticasvinculacion",
        "practicasvinculacion",
        "practicas",
        "pricasvinculacion",
        "prᣴicasvinculacion"
      ],
      ""
    );

    // Actualización de Datos (tu DB: "ActualizaciónDatos")
    model.Datos = pick(
      data,
      [
        "ActualizaciónDatos",
        "ActualizacionDatos",
        "actualizacióndatos",
        "actualizaciondatos",
        "datos",
        "actualizacitos",
        "actualizaci󮄡tos"
      ],
      ""
    );

    // Tipo titulación (deja ambos nombres por compatibilidad)
    model.TipoTitulacion = pick(
      data,
      ["TipoTitulacion", "tipotitulacion", "modalidadTitulacion", "ModalidadTitulacion"],
      ""
    );

    // Devuelve original + normalizado
    return Object.assign({}, data, model);
  }

  // -------------------------
  // Lectura remota
  // -------------------------

  function listarEstudiantes() {
    var dbInstance = ensureDB();
    if (!dbInstance) {
      var err = new Error("FichaDB no disponible");
      log(err.message);
      return Promise.reject(err);
    }

    log("Leyendo colección Estudiantes desde Firestore…");

    return dbInstance
      .collection("Estudiantes")
      .get()
      .then(function (snapshot) {
        var lista = snapshot.docs.map(function (doc) {
          return mapDocToModel(doc);
        });
        log("Se leyeron", lista.length, "estudiantes");
        return lista;
      })
      .catch(function (err) {
        console.error("[FichaDataRemote] Error al leer la colección Estudiantes:", err);
        throw err;
      });
  }

  // -------------------------
  // Servicio con cache
  // -------------------------

  var cache = [];
  var loaded = false;

  function loadAll() {
    log("Cargando estudiantes desde Firestore hacia cache…");

    return listarEstudiantes().then(function (lista) {
      cache = Array.isArray(lista) ? lista : [];
      loaded = true;
      log("Estudiantes cargados en cache:", cache.length);
      return cache;
    });
  }

  function getAll() {
    return cache;
  }

  function isLoaded() {
    return loaded;
  }

  function getById(id) {
    if (!id) return null;
    for (var i = 0; i < cache.length; i++) {
      if (cache[i].id === id) return cache[i];
    }
    return null;
  }

  function updateTipoEnCache(id, tipo) {
    var s = getById(id);
    if (s) {
      s.TipoTitulacion = tipo;
      log("Actualizado TipoTitulacion en cache para", id, "→", tipo);
    }
  }

  function updateObservacionesEnCache(id, obs) {
    var s = getById(id);
    if (s) {
      s.Observaciones = obs;
      log("Actualizadas Observaciones en cache para", id);
    }
  }

  // API pública
  window.FichaDataRemote = {
    listarEstudiantes: listarEstudiantes,
    periodoCodigoAHumano: periodoCodigoAHumano
  };

  window.FichaStudentService = {
    loadAll: loadAll,
    getAll: getAll,
    isLoaded: isLoaded,
    getById: getById,
    updateTipoEnCache: updateTipoEnCache,
    updateObservacionesEnCache: updateObservacionesEnCache
  };
})(window);
