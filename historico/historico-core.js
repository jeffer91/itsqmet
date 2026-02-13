// Archivo: historico-core.js
// Ubicación: /historico/historico-core.js
// Función: Orquestador UI/estado. Maneja error de índice y expone link en filtros sin “quedarse cargando”.
(function (window, document) {
  "use strict";

  const State = {
    periods: [],
    current: {
      periodId: "",
      career: "",
      requisito: ""
    },
    careers: [],
    requisitos: [],
    cuts: [],          // lista de cortes del periodo (historial)
    currentCutId: null,
    currentCut: null,
    statusText: "Listo",
    indexUrl: ""       // si falta índice, mostramos link
  };

  function renderFilters() {
    HistoricoUIFilters.render(
      "historico-filters",
      {
        periods: State.periods,
        careers: State.careers,
        requisitos: State.requisitos,
        current: State.current,
        statusText: State.statusText,
        indexUrl: State.indexUrl
      },
      {
        onPeriodChange,
        onCareerChange,
        onRequisitoChange,
        onGenerateCut
      }
    );
  }

  function clearIndexNotice() {
    State.indexUrl = "";
  }

  function setIndexNoticeFromCuts(cuts) {
    // Nuestro bus adjunta __indexUrl en el array cuando usó fallback
    const url = cuts && cuts.__indexUrl ? String(cuts.__indexUrl) : "";
    if (url) State.indexUrl = url;
  }

  async function init() {
    try {
      State.periods = await HistoricoBus.getPeriods();
      renderFilters();
    } catch (err) {
      console.error(err);
      State.statusText = "Error cargando períodos";
      renderFilters();
    }
  }

  async function onPeriodChange(periodId) {
    State.current.periodId = periodId;
    State.currentCutId = null;
    State.currentCut = null;
    State.careers = [];
    State.requisitos = [];
    State.cuts = [];
    clearIndexNotice();

    if (!periodId) {
      State.statusText = "Selecciona un período";
      renderFilters();
      HistoricoUITimeline.render("historico-timeline", [], () => {});
      HistoricoUIDetail.clear("historico-detail");
      return;
    }

    try {
      State.statusText = "Cargando historial…";
      renderFilters();

      // Cargar cortes existentes
      State.cuts = await HistoricoBus.listMacroCuts(periodId);

      // Si el bus usó fallback por falta de índice, exponemos el link
      setIndexNoticeFromCuts(State.cuts);
      if (State.indexUrl) {
        State.statusText = "Historial cargado (sin índice: usando fallback)";
      }

      // Poblar combos desde el último corte si existe
      const last = State.cuts?.[0];
      if (last?.agg) {
        const careers = Object.keys(last.agg || {});
        const reqSet = new Set();
        for (const c of careers) {
          for (const r of Object.keys(last.agg[c] || {})) reqSet.add(r);
        }
        State.careers = careers.sort();
        State.requisitos = Array.from(reqSet).sort();
      }

      // Si no hay cortes, indicamos claramente
      if (!State.cuts.length) {
        State.statusText = "Sin cortes: genera el primero";
      } else if (!State.indexUrl) {
        State.statusText = "Historial cargado";
      }

      renderFilters();
      HistoricoUITimeline.render("historico-timeline", State.cuts, onCutSelect);
      HistoricoUIDetail.clear("historico-detail");
    } catch (err) {
      console.error(err);
      State.statusText = "Error: revisa consola (permisos/datos)";
      renderFilters();
      HistoricoUITimeline.render("historico-timeline", [], () => {});
      HistoricoUIDetail.clear("historico-detail");
    }
  }

  function onCareerChange(career) {
    State.current.career = career || "";
    redrawCurrentCut();
  }

  function onRequisitoChange(requisito) {
    State.current.requisito = requisito || "";
    redrawCurrentCut();
  }

  async function onCutSelect(cutId) {
    State.currentCutId = cutId;
    HistoricoUITimeline.setActive(cutId);

    State.currentCut = State.cuts.find(c => c.id === cutId) || null;
    redrawCurrentCut();
  }

  function redrawCurrentCut() {
    if (!State.currentCut) {
      HistoricoUIDetail.clear("historico-detail");
      return;
    }

    HistoricoUIDetail.render("historico-detail", {
      cut: State.currentCut,
      career: State.current.career,
      requisito: State.current.requisito
    });

    const cutsAsc = [...State.cuts].sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return ta - tb;
    });

    HistoricoUICharts.render("historico-charts", {
      cutsAsc,
      career: State.current.career,
      requisito: State.current.requisito
    });
  }

  async function onGenerateCut() {
    const periodId = State.current.periodId;
    if (!periodId) return;

    try {
      State.statusText = "Generando corte…";
      clearIndexNotice();
      renderFilters();

      // 1) leer estudiantes
      const students = await HistoricoBus.listStudentsByPeriod(periodId);

      // 2) agregación macro
      const { agg, careers, requisitos, totalEstudiantes } = HistoricoLogic.aggregateStudents(students);

      // 3) delta vs último corte
      const last = await HistoricoBus.getLastMacroCut(periodId);
      if (last?.__indexUrl) State.indexUrl = String(last.__indexUrl || "");

      const prevAgg = last?.agg || {};
      const { delta, changedCells } = HistoricoLogic.diffAggregates(prevAgg, agg);

      if (changedCells === 0) {
        State.statusText = "Sin cambios: no se guardó corte";
        renderFilters();
        return;
      }

      // 4) guardar en historial
      const meta = {
        totalEstudiantes,
        careersCount: careers.length,
        requisitosCount: requisitos.length,
        changedCells
      };

      await HistoricoBus.saveMacroCut({ periodoId: periodId, agg, delta, meta });

      // 5) recargar historial
      State.statusText = "Corte guardado en historial ✅";
      renderFilters();

      State.cuts = await HistoricoBus.listMacroCuts(periodId);
      setIndexNoticeFromCuts(State.cuts);

      const newest = State.cuts?.[0];
      if (newest?.agg) {
        State.careers = Object.keys(newest.agg || {}).sort();
        const reqSet = new Set();
        for (const c of Object.keys(newest.agg || {})) {
          for (const r of Object.keys(newest.agg[c] || {})) reqSet.add(r);
        }
        State.requisitos = Array.from(reqSet).sort();
      }

      if (State.indexUrl) {
        State.statusText = "Corte guardado ✅ (sin índice: usando fallback)";
      }

      renderFilters();
      HistoricoUITimeline.render("historico-timeline", State.cuts, onCutSelect);

      if (State.cuts.length) {
        const firstId = State.cuts[0].id;
        await onCutSelect(firstId);
      }

    } catch (err) {
      console.error(err);
      State.statusText = "Error: revisa consola (índices/permisos)";
      renderFilters();
    }
  }

  document.addEventListener("DOMContentLoaded", init);

})(window, document);
