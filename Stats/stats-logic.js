/* =========================================================
Archivo: stats-logic.js
Función: Reglas de negocio. Determina estados, filtros y cálculos.
========================================================= */

(function (window) {
  "use strict";
  const Utils = window.StatsUtils;

  const REQUISITOS = [
    { key: "academico", label: "Académico", aliases: ["academico"] },
    { key: "documentacion", label: "Documentación", aliases: ["documentacion"] },
    { key: "financiero", label: "Financiero", aliases: ["financiero"] },
    {
      key: "practicas",
      label: "Prácticas",
      aliases: ["prᣴicasvinculacion", "prácticasvinculacion", "prácticas"]
    },
    { key: "vinculacion", label: "Vinculación", aliases: ["vinculacion"] },
    {
      key: "seguimiento",
      label: "Seguimiento",
      aliases: ["seguimientograduados", "seguimiento"]
    },
    { key: "ingles", label: "Inglés", aliases: ["ingles"] },
    {
      key: "datos",
      label: "Act. Datos",
      aliases: ["actualizaci󮄡tos", "actualizaciondatos", "actualizacion"]
    },
    { key: "titulacion", label: "Titulación", aliases: ["titulacion"] }
  ];

  function findReqDef(reqKey) {
    return REQUISITOS.find(r => r.key === reqKey) || null;
  }

  function getStudentCareerRaw(s) {
    const st = s || {};
    return st.nombrecarrera || st.nombreCarrera || st.NombreCarrera || "";
  }

  function normCareer(s) {
    return Utils.normalizeCareer(getStudentCareerRaw(s)) || "SIN CARRERA";
  }

  const StatsLogic = {

    isRetired(student) {
      const s = student || {};
      const estado = Utils.normalizeText(s.estadoMatricula || "").toUpperCase();
      const ACTIVOS = ["ACTIVO", "MATRICULADO", "VIGENTE", "RETIRADO", "EGRESADO"];
      if (!s.estadoMatricula) return !s.ultimaSincronizacion;
      return !ACTIVOS.includes(estado);
    },

    getReqStatus(student, reqKey) {
      const st = student || {};

      // Caso especial: titulación por nota de artículo
      if (reqKey === "titulacion") {
        if (this.hasApprovedArticle(st)) return "CUMPLE";
      }

      const reqDef = findReqDef(reqKey);
      if (!reqDef) return "N/A";

      const searchKeys = [reqDef.key, ...reqDef.aliases];

      const stKeys = Object.keys(st);
      const stKeysNorm = stKeys.reduce((acc, k) => {
        acc[Utils.normalizeKey(k)] = k;
        return acc;
      }, {});

      for (let alias of searchKeys) {
        // Exacto
        if (st[alias] !== undefined) {
          const val = String(st[alias]).trim().toUpperCase();
          if (val === "CUMPLE" || val === "NO CUMPLE") return val;
        }

        // Normalizado
        const normAlias = Utils.normalizeKey(alias);
        if (stKeysNorm[normAlias]) {
          const val = String(st[stKeysNorm[normAlias]]).trim().toUpperCase();
          if (val === "CUMPLE" || val === "NO CUMPLE") return val;
        }
      }

      return "NO CUMPLE";
    },

    hasApprovedArticle(student) {
      const keys = ["notaArticulo", "calificacionArticulo", "articuloNota"];
      for (let k of keys) {
        if (student[k]) {
          const val = parseFloat(String(student[k]).replace(",", "."));
          if (!isNaN(val) && val >= 7) return true;
        }
      }
      return false;
    },

    /**
     * processStats(students, focusReqKey?)
     * - SIEMPRE devuelve reqStatsAll para el gráfico global (barras).
     * - Si hay focusReqKey:
     *   - devuelve focus (pastel global Cumple/No Cumple)
     *   - devuelve focusByCareer (Cumple/No Cumple por carrera SOLO del requisito)
     * - Mantiene stats.reqStats como alias de reqStatsAll (compatibilidad).
     */
    processStats(students, focusReqKey) {
      const list = Array.isArray(students) ? students : [];
      const total = list.length;

      let aprobadosFinales = 0;
      let habilitadosArticulo = 0;
      let titulacionCompleta = 0;

      const reqStatsAll = REQUISITOS.map(r => ({ ...r, cumple: 0, noCumple: 0 }));

      list.forEach(s => {
        let cumpleTodoMenosTit = true;

        reqStatsAll.forEach(rStats => {
          const status = this.getReqStatus(s, rStats.key);
          if (status === "CUMPLE") rStats.cumple++;
          else rStats.noCumple++;

          if (rStats.key !== "titulacion" && status !== "CUMPLE") {
            cumpleTodoMenosTit = false;
          }
        });

        if (cumpleTodoMenosTit) habilitadosArticulo++;

        const titStatus = this.getReqStatus(s, "titulacion");
        if (titStatus === "CUMPLE") titulacionCompleta++;

        if (cumpleTodoMenosTit && titStatus === "CUMPLE") aprobadosFinales++;
      });

      const base = {
        mode: "global",
        total,
        aprobadosFinales,
        habilitadosArticulo,
        titulacionCompleta,

        // gráfico global (barras) SIEMPRE
        reqStatsAll,
        reqStats: reqStatsAll, // compat

        pcAprobados: Utils.toPercent(aprobadosFinales, total),

        // foco (pastel)
        focusReqKey: null,
        focusReqLabel: null,
        focus: null,

        // nuevo: foco por carrera (solo si hay requisito)
        focusByCareer: null
      };

      const focusKey = (focusReqKey || "").trim();
      if (!focusKey) return base;

      const def = findReqDef(focusKey);
      if (!def) return base;

      const one = reqStatsAll.find(r => r.key === focusKey) || { ...def, cumple: 0, noCumple: total };
      const focusTotal = one.cumple + one.noCumple;

      // ===== NUEVO: cálculo por carrera SOLO del requisito seleccionado =====
      const map = new Map(); // career -> { career, cumple, noCumple }
      list.forEach(s => {
        const c = normCareer(s);
        if (!map.has(c)) map.set(c, { career: c, cumple: 0, noCumple: 0 });

        const stt = this.getReqStatus(s, focusKey);
        if (stt === "CUMPLE") map.get(c).cumple++;
        else map.get(c).noCumple++;
      });

      const focusByCareer = Array.from(map.values()).map(x => {
        const t = (x.cumple + x.noCumple);
        return {
          career: x.career,
          cumple: x.cumple,
          noCumple: x.noCumple,
          total: t,
          pcCumple: Utils.toPercent(x.cumple, t)
        };
      });

      // Orden: más NO CUMPLE primero, luego alfabético
      focusByCareer.sort((a, b) => {
        if (b.noCumple !== a.noCumple) return b.noCumple - a.noCumple;
        return a.career.localeCompare(b.career, "es");
      });

      return {
        ...base,
        mode: "req",
        focusReqKey: focusKey,
        focusReqLabel: def.label,
        focus: {
          key: focusKey,
          label: def.label,
          cumple: one.cumple,
          noCumple: one.noCumple,
          total: focusTotal,
          pcCumple: Utils.toPercent(one.cumple, focusTotal)
        },
        focusByCareer
      };
    },

    getRequirementsList() { return REQUISITOS; }
  };

  window.StatsLogic = StatsLogic;
})(window);
