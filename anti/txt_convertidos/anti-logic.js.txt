/* =========================================================
Archivo: anti-logic.js
Ubicación: anti/anti-logic.js
Función: Reglas de negocio + extracción de vista para UI
========================================================= */

(function (window) {
  "use strict";

  const U = window.AntiUtils;

  const REQS = [
    { key: "academico", label: "Académico", aliases: ["academico"] },
    { key: "documentacion", label: "Documentación", aliases: ["documentacion"] },
    { key: "financiero", label: "Financiero", aliases: ["financiero"] },
    {
      key: "practicas",
      label: "Prácticas",
      aliases: ["prᣴicasvinculacion", "prácticasvinculacion", "practicasvinculacion", "prácticas"]
    },
    { key: "vinculacion", label: "Vinculación", aliases: ["vinculacion"] },
    { key: "seguimiento", label: "Seguimiento", aliases: ["seguimientograduados", "seguimiento"] },
    { key: "ingles", label: "Inglés", aliases: ["ingles"] },
    { key: "datos", label: "Act. Datos", aliases: ["actualizaci󮄡tos", "actualizaciondatos", "actualizacion"] },
    { key: "titulacion", label: "Titulación", aliases: ["titulacion"] }
  ];

  function getStudentCareer(s) {
    return s.nombrecarrera || s.nombreCarrera || s.NombreCarrera || "";
  }

  function getStudentName(s) {
    return s.nombres || s.Nombres || s.nombre || s.Nombre || s.apellidos || s.Apellidos || "";
  }

  function findReqDef(key) {
    return REQS.find(r => r.key === key) || null;
  }

  function readAntiPct(student) {
    const s = student || {};
    const v = s.AntiPlagioOriginalidad;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  const AntiLogic = {
    getRequirements() { return REQS; },

    isActiveStudent(student) {
      const s = student || {};
      const estado = U.normalizeText(s.estadoMatricula || "").toUpperCase();

      const ACEPTADOS = ["ACTIVO", "MATRICULADO", "VIGENTE", "RETIRADO", "EGRESADO"];
      if (!s.estadoMatricula) return !!s.ultimaSincronizacion;
      return ACEPTADOS.includes(estado);
    },

    getReqStatus(student, reqKey) {
      const st = student || {};
      const reqDef = findReqDef(reqKey);
      if (!reqDef) return "N/A";

      const searchKeys = [reqDef.key, ...reqDef.aliases];

      const keys = Object.keys(st);
      const keysNorm = keys.reduce((acc, k) => {
        acc[U.normalizeKey(k)] = k;
        return acc;
      }, {});

      for (const alias of searchKeys) {
        if (st[alias] !== undefined) {
          const v = String(st[alias]).trim().toUpperCase();
          if (v === "CUMPLE" || v === "NO CUMPLE") return v;
        }

        const na = U.normalizeKey(alias);
        if (keysNorm[na]) {
          const v = String(st[keysNorm[na]]).trim().toUpperCase();
          if (v === "CUMPLE" || v === "NO CUMPLE") return v;
        }
      }

      return "NO CUMPLE";
    },

    isEnabledForAnti(student) {
      const s = student || {};
      const reqs = REQS.filter(r => r.key !== "titulacion");
      for (const r of reqs) {
        const st = this.getReqStatus(s, r.key);
        if (st !== "CUMPLE") return false;
      }
      return true;
    },

    extractStudentView(student) {
      const s = student || {};
      const anti = readAntiPct(s);

      return {
        cedula: U.safe(s.cedula || s._docId || s.docId || ""),
        nombre: U.safe(getStudentName(s)),
        carrera: U.normalizeCareer(getStudentCareer(s)) || "SIN CARRERA",
        periodoId: U.safe(s.periodoId || s.periodo_id || ""),
        antiOriginalidad: anti,              // number | null
        antiFechaTexto: U.safe(s.AntiPlagioFechaTexto || ""),
        raw: s
      };
    }
  };

  window.AntiLogic = AntiLogic;
})(window);
