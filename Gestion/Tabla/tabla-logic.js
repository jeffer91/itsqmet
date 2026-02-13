// tabla-logic.js
// ------------------------------------------------------------
// LÓGICA CENTRAL PARA TABLA FIREBASE
// Transforma los datos obtenidos de Firestore para que la UI
// pueda pintarlos correctamente.
//
// ACTUALIZACIÓN (2026-01-07):
// - Soporta nueva estructura BD (PascalCase / tildes):
//   Nombres, NombreCarrera, numeroIdentificacion,
//   ActualizaciónDatos, PrácticasVinculacion, SeguimientoGraduados, etc.
// - Mantiene compatibilidad con estructura anterior (minúsculas).
// ------------------------------------------------------------

(function (window) {
  "use strict";

  // ------------------------------------------------------------
  // Helpers: lectura segura + compatibilidad
  // ------------------------------------------------------------
  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function getFirstValue(row, keys) {
    if (!row || !keys || !keys.length) return "";
    for (const k of keys) {
      if (k && hasOwn(row, k) && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
        return row[k];
      }
    }
    return "";
  }

  function normalizarEstado(valor) {
    const v = (valor || "").toString().trim().toUpperCase();
    if (!v) return "";
    if (v === "CUMPLE") return "CUMPLE";
    if (v === "NO CUMPLE") return "NO CUMPLE";
    return v;
  }

  // ------------------------------------------------------------
  // Definición de Requisitos y sus Alias (nueva + vieja BD)
  // ------------------------------------------------------------
  const REQUISITOS_DEF = [
    { key: "academico", aliases: ["Academico", "academico", "Académico"] },
    { key: "documentacion", aliases: ["Documentacion", "documentacion", "Documentación"] },
    { key: "financiero", aliases: ["Financiero", "financiero"] },
    { key: "ingles", aliases: ["Ingles", "ingles", "Inglés"] },

    {
      key: "practicas",
      aliases: [
        // Nueva BD
        "PrácticasVinculacion",
        "PracticasVinculacion",
        // Vieja BD y variaciones
        "prácticasvinculacion",
        "practicasvinculacion",
        "prᣴicasvinculacion",
        "practicas",
        "prácticas",
        "Practicas"
      ]
    },

    {
      key: "seguimiento",
      aliases: [
        // Nueva BD
        "SeguimientoGraduados",
        // Vieja BD y variaciones
        "seguimientograduados",
        "SeguimientoGraduados", // por si acaso viene igual en otro case
        "seguimiento",
        "Seguimiento"
      ]
    },

    { key: "titulacion", aliases: ["Titulacion", "titulacion", "Titulación"] },
    { key: "vinculacion", aliases: ["Vinculacion", "vinculacion", "Vinculación"] },

    {
      key: "datos",
      aliases: [
        // Nueva BD
        "ActualizaciónDatos",
        "ActualizacionDatos",
        // Vieja BD y variaciones
        "actualizacióndatos",
        "actualizaciondatos",
        "actualizaci󮄡tos",
        "actualizacion",
        "Actualizacion"
      ]
    }
  ];

  const LABELS_REQUISITOS = {
    academico: "Académico",
    documentacion: "Documentación",
    financiero: "Financiero",
    ingles: "Inglés",
    practicas: "Prácticas",
    seguimiento: "Seguimiento",
    titulacion: "Titulación",
    vinculacion: "Vinculación",
    datos: "Datos"
  };

  // ------------------------------------------------------------
  // Normalizadores
  // ------------------------------------------------------------
  function normalizarCarrera(nombre) {
    if (!nombre) return "";
    return String(nombre)
      .replace("MECNICA", "MECÁNICA")
      .replace("EDUACIӎ", "Educación")
      .replace("PڂLICO", "PÚBLICO")
      .replace("ADMINISTRACIӎ", "Administración");
  }

  function separarApellidosNombres(cadena) {
    if (!cadena) return { apellidos: "", nombres: "" };
    const partes = String(cadena).trim().split(/\s+/);
    if (partes.length === 1) return { apellidos: partes[0], nombres: "" };

    // Heurística simple: 2 apellidos + resto nombres
    const apellidos = partes.slice(0, 2).join(" ");
    const nombres = partes.slice(2).join(" ");
    return { apellidos, nombres };
  }

  // ------------------------------------------------------------
  // Requisitos
  // ------------------------------------------------------------
  function obtenerEstadoRequisito(row, reqDef) {
    for (const alias of reqDef.aliases) {
      if (alias && hasOwn(row, alias) && row[alias] !== undefined) {
        return normalizarEstado(row[alias]);
      }
    }
    return "";
  }

  function construirRequisitos(row) {
    const estados = {};
    REQUISITOS_DEF.forEach((def) => {
      estados[def.key] = obtenerEstadoRequisito(row, def);
    });

    const pendientesKeys = Object.keys(estados).filter((k) => {
      const v = estados[k];
      if (!v) return false;
      return v !== "CUMPLE";
    });

    const pendientesTexto = pendientesKeys
      .map((k) => LABELS_REQUISITOS[k] || k)
      .join(", ");

    return {
      estados,
      pendientesKeys,
      pendientesTexto
    };
  }

  // ------------------------------------------------------------
  // Procesamiento principal
  // ------------------------------------------------------------
  function procesarEstudiantes(rows = []) {
    return (rows || []).map((r) => {
      // Campos base (nueva BD + vieja BD)
      const nombreCrudo = String(
        getFirstValue(r, [
          "Nombres",
          "nombres",
          "NombreCompleto",
          "nombreCompleto"
        ]) || ""
      ).trim();

      const carreraCruda = String(
        getFirstValue(r, [
          "NombreCarrera",
          "nombrecarrera",
          "NombreCarrera",
          "Nombre_carrera"
        ]) || ""
      ).trim();

      const cedula = String(
        getFirstValue(r, [
          "numeroIdentificacion",
          "numeroidentificacion",
          "NumeroIdentificacion",
          "NúmeroIdentificacion",
          "NumeroIdentificación"
        ]) || r._id || ""
      ).trim();

      const { apellidos, nombres } = separarApellidosNombres(nombreCrudo);

      const req = construirRequisitos(r);

      // Mantener compatibilidad con "removido" antiguo (no cambiamos UI)
      const removido = (r.estadoRegistro === "REMOVIDO") || (r.removido === true) || false;

      // Guardamos info extra por si luego quieres usarlo en UI (no afecta hoy)
      const estadoMatricula = (r.estadoMatricula || r.estadomatricula || "").toString().trim().toUpperCase();
      const retirado = estadoMatricula === "RETIRADO" || !!r.retiradoEn || false;

      return {
        ...r,

        nombreCompletoOriginal: nombreCrudo,
        apellidos: apellidos,
        nombres: nombres,

        // Campos estandarizados para UI
        nombrecarrera: normalizarCarrera(carreraCruda),
        numeroidentificacion: cedula,

        requisitos: req.estados,
        requisitosPendientes: req.pendientesKeys,
        requisitosPendientesTexto: req.pendientesTexto,

        // Flags
        removido,
        retirado,

        alertaAuto: removido ? "⚠️ Estudiante removido del último Excel" : ""
      };
    });
  }

  const columnasTabla = [
    { campo: "apellidos", titulo: "Apellidos" },
    { campo: "nombres", titulo: "Nombres" },
    { campo: "numeroidentificacion", titulo: "Cédula" },
    { campo: "nombrecarrera", titulo: "Carrera" }
  ];

  window.TablaLogic = {
    procesarEstudiantes,
    columnasTabla,
    LABELS_REQUISITOS
  };
})(window);
